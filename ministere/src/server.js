import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config, ROOT, MEDIA_DIR, VOICES_DIR, loadCampaign } from './config.js';
import { recordedVoice } from './studio/tts.js';
import { db, json } from './db.js';
import { campaignState } from './campaign.js';
import { computeStats, boostCandidates } from './analyst.js';
import { usageCost } from './claude.js';
import { resolve, recordClick, finalCaption, shortUrl, bioCode } from './links.js';
import { dailyRun, isRunning, produce, write } from './pipeline.js';
import { discordStatus, publishToDiscord } from './discord/bot.js';
import { closeBrowser } from './studio/render.js';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '[serveur]', ...a);

export function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));

  // ── Public : liens courts trackés ───────────────────────────────────────
  app.get('/go/:code', (req, res) => {
    const target = resolve(req.params.code);
    if (!target) return res.status(404).send('Lien inconnu.');
    recordClick(req.params.code, req);
    res.redirect(302, target);
  });
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // ── Tout le reste est protégé par mot de passe ─────────────────────────
  let password = config.dashboard.password;
  if (!password || password === 'change-moi') {
    password = crypto.randomBytes(9).toString('base64url');
    log(`⚠ DASHBOARD_PASSWORD non défini : mot de passe temporaire « ${password} » (utilisateur ${config.dashboard.user})`);
  }
  const expected = 'Basic ' + Buffer.from(`${config.dashboard.user}:${password}`).toString('base64');
  app.use((req, res, next) => {
    const got = req.headers.authorization || '';
    const ok = got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
    if (ok) return next();
    res.set('WWW-Authenticate', 'Basic realm="Ministere", charset="UTF-8"').status(401).send('Accès réservé au Ministère.');
  });

  app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h' }));
  app.use('/fonts', express.static(path.join(ROOT, 'node_modules', '@fontsource'), { maxAge: '7d' }));
  app.use(express.static(path.join(ROOT, 'public')));

  const api = express.Router();
  const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(400).json({ error: e.message }));

  const getPost = (id) => {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!post) throw new Error('Post introuvable');
    return post;
  };

  const present = (post) => {
    const captions = json(post.captions, {});
    const pubs = db.prepare('SELECT * FROM publications WHERE post_id = ?').all(post.id);
    const clicks = Object.fromEntries(db.prepare(`SELECT code, COUNT(DISTINCT ip_hash) n FROM clicks WHERE code IN (SELECT code FROM publications WHERE post_id = ?) GROUP BY code`)
      .all(post.id).map((r) => [r.code, r.n]));
    return {
      ...post,
      content: json(post.content),
      media: json(post.media, []),
      publications: pubs.map((p) => ({
        ...p,
        clicks: clicks[p.code] || 0,
        caption: captions[p.platform] ? finalCaption(post, captions[p.platform]) : '',
        link: shortUrl(p.code),
      })),
      reddit_title: json(post.content)?.reddit_title || '',
      has_voice: Boolean(recordedVoice(post.id)),
    };
  };

  api.get('/state', (_req, res) => {
    const st = campaignState();
    const c = loadCampaign();
    const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM posts GROUP BY status').all().map((r) => [r.status, r.n]));
    res.json({
      server_name: c.server_name, day: st.day, phase: st.phase, daysLeft: st.daysLeft, isOpen: st.isOpen, opening: st.openingLabel,
      counts, running: isRunning(), cost: usageCost(), discord: discordStatus(),
      claude: Boolean(config.claude.apiKey), tts: config.tts.provider,
      bioLinks: Object.keys(c.platforms).filter((p) => !c.platforms[p].clickable_links)
        .map((p) => ({ platform: p, label: c.platforms[p].label, url: shortUrl(bioCode(p)) })),
      invites: db.prepare('SELECT * FROM invites').all(),
      platforms: c.platforms, angles: c.angles,
    });
  });

  api.get('/posts', (req, res) => {
    const status = req.query.status;
    const rows = status
      ? db.prepare('SELECT * FROM posts WHERE status = ? ORDER BY id DESC LIMIT 100').all(status)
      : db.prepare('SELECT * FROM posts ORDER BY id DESC LIMIT 100').all();
    res.json(rows.map(present));
  });

  api.get('/stats', (_req, res) => res.json({ ...computeStats({ days: 30 }), boost: boostCandidates() }));

  api.post('/generate', wrap(async (req, res) => {
    if (isRunning()) throw new Error('Génération déjà en cours');
    const count = Math.min(10, Math.max(1, Number(req.body?.count) || config.scheduler.postsPerDay));
    dailyRun(count).catch((e) => log('génération échouée :', e.message));
    res.status(202).json({ started: true, count });
  }));

  // Brief manuel : tu donnes l'idée, le Ministère écrit et produit.
  api.post('/brief', wrap(async (req, res) => {
    const { format, angle, hook, platforms } = req.body || {};
    if (!format || !hook) throw new Error('format et idée requis');
    const st = campaignState();
    const { lastInsertRowid } = db.prepare(`INSERT INTO briefs (phase, format, angle, theme, hook, rationale, platforms) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(st.phase.id, format, angle || 'propagande', '', hook, 'Brief manuel', JSON.stringify(platforms?.length ? platforms : ['discord']));
    res.status(202).json({ started: true });
    try { const id = await write(lastInsertRowid); await produce(id); } catch (e) { log('brief manuel échoué :', e.message); }
    finally { await closeBrowser(); }
  }));

  api.post('/posts/:id/approve', wrap(async (req, res) => {
    db.prepare(`UPDATE posts SET status = 'approved' WHERE id = ? AND status IN ('ready','rejected')`).run(getPost(req.params.id).id);
    res.json(present(getPost(req.params.id)));
  }));

  api.post('/posts/:id/reject', wrap(async (req, res) => {
    db.prepare(`UPDATE posts SET status = 'rejected', review_note = ? WHERE id = ?`).run(req.body?.note || null, getPost(req.params.id).id);
    res.json(present(getPost(req.params.id)));
  }));

  // Correction manuelle des textes, puis nouveau rendu.
  api.put('/posts/:id/content', wrap(async (req, res) => {
    const post = getPost(req.params.id);
    const content = { ...json(post.content), ...req.body.content };
    const captions = req.body.captions ?? json(post.captions);
    db.prepare('UPDATE posts SET content = ?, captions = ?, title = ? WHERE id = ?')
      .run(JSON.stringify(content), JSON.stringify(captions), content.title, post.id);
    await produce(post.id);
    await closeBrowser();
    res.json(present(getPost(post.id)));
  }));

  api.post('/posts/:id/render', wrap(async (req, res) => {
    await produce(getPost(req.params.id).id);
    await closeBrowser();
    res.json(present(getPost(req.params.id)));
  }));

  // Ta prise de voix (enregistrée dans le navigateur ou importée), puis nouveau montage de la vidéo.
  const AUDIO_EXT = { 'audio/webm': 'webm', 'video/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
    'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav' };
  api.post('/posts/:id/voice', express.raw({ type: () => true, limit: '40mb' }), wrap(async (req, res) => {
    const post = getPost(req.params.id);
    if (post.format !== 'short') throw new Error('Seuls les Shorts ont une voix off');
    const mime = (req.headers['content-type'] || '').split(';')[0].trim();
    const ext = AUDIO_EXT[mime];
    if (!ext) throw new Error(`Format audio non reconnu (${mime || 'inconnu'}) : utilise mp3, m4a, wav, ogg ou webm`);
    if (!req.body?.length) throw new Error('Fichier audio vide');
    const old = recordedVoice(post.id);
    if (old) fs.rmSync(old);
    fs.writeFileSync(path.join(VOICES_DIR, `post-${post.id}.${ext}`), req.body);
    await produce(post.id);
    await closeBrowser();
    res.json(present(getPost(post.id)));
  }));

  api.delete('/posts/:id/voice', wrap(async (req, res) => {
    const post = getPost(req.params.id);
    const old = recordedVoice(post.id);
    if (old) fs.rmSync(old);
    await produce(post.id);
    await closeBrowser();
    res.json(present(getPost(post.id)));
  }));

  api.post('/posts/:id/publish/:platform', wrap(async (req, res) => {
    const post = getPost(req.params.id);
    db.prepare(`UPDATE publications SET published_at = COALESCE(published_at, datetime('now')), url = COALESCE(?, url) WHERE post_id = ? AND platform = ?`)
      .run(req.body?.url || null, post.id, req.params.platform);
    db.prepare(`UPDATE posts SET status = 'published' WHERE id = ?`).run(post.id);
    res.json(present(getPost(post.id)));
  }));

  api.post('/posts/:id/discord', wrap(async (req, res) => {
    const post = getPost(req.params.id);
    if (!['approved', 'published'].includes(post.status)) throw new Error('Valide le post avant de le publier');
    const url = await publishToDiscord(post.id);
    db.prepare(`UPDATE posts SET status = 'published' WHERE id = ?`).run(post.id);
    res.json({ url, post: present(getPost(post.id)) });
  }));

  api.put('/publications/:id/stats', wrap(async (req, res) => {
    const n = (v) => (v === '' || v == null ? null : Math.max(0, parseInt(v, 10) || 0));
    const { views, likes, comments, shares, url } = req.body || {};
    db.prepare('UPDATE publications SET views = ?, likes = ?, comments = ?, shares = ?, url = COALESCE(?, url) WHERE id = ?')
      .run(n(views), n(likes), n(comments), n(shares), url || null, req.params.id);
    res.json({ ok: true });
  }));

  app.use('/api', api);
  app.listen(config.port, () => log(`dashboard sur http://localhost:${config.port} — liens publics ${config.publicUrl}/go/…`));
  return app;
}

