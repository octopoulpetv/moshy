// Chaîne de production : stratège → rédacteur → studio.
import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_DIR, loadCampaign } from './config.js';
import { db, json } from './db.js';
import { generateJSON } from './claude.js';
import { campaignState } from './campaign.js';
import { computeStats, lastLearnings } from './analyst.js';
import { strategistSystem, strategistSchema, writerSystem, writerSchema, mediaKind } from './prompts.js';
import { postCode } from './links.js';
import { renderPNG, closeBrowser } from './studio/render.js';
import { buildShort } from './studio/video.js';
import { synthesize } from './studio/tts.js';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '[ministère]', ...a);

// ── 1. Stratège ──────────────────────────────────────────────────────────
export async function plan(count) {
  const st = campaignState();
  const stats = computeStats({ days: 21 });
  const recent = db.prepare(`SELECT format, angle, title FROM posts ORDER BY id DESC LIMIT 20`).all();

  const user = `Date : ${st.day}. Phase : « ${st.phase.label} » — ${st.phase.objective}
Angles préférés de la phase : ${st.phase.preferred_angles.join(', ')}.
Ouverture du serveur : ${st.openingLabel} (${st.isOpen ? 'déjà ouvert' : `J-${st.daysLeft}`}).

Statistiques des 21 derniers jours (score = arrivées×10 + clics + vues/1000) :
${JSON.stringify({ totals: stats.totals, byAngle: stats.byAngle, byFormat: stats.byFormat, platforms: stats.platforms, top: stats.top.map(({ title, angle, format, score }) => ({ title, angle, format, score })) }, null, 1)}

Enseignements précédents : ${lastLearnings() ?? 'aucun (début de campagne)'}

Contenus récents à ne pas répéter :
${recent.map((r) => `- [${r.format}/${r.angle}] ${r.title}`).join('\n') || '- aucun'}

Produis exactement ${count} briefs pour aujourd'hui.`;

  const out = await generateJSON({ purpose: 'strategie', system: strategistSystem(), user, schema: strategistSchema(), effort: 'medium' });
  db.prepare('INSERT INTO insights (summary) VALUES (?)').run(JSON.stringify(out));

  const platforms = loadCampaign().platforms;
  const insert = db.prepare(`INSERT INTO briefs (phase, format, angle, theme, hook, rationale, platforms) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const ids = out.briefs.slice(0, count).map((b) => {
    // Filet de sécurité : on ne garde que les plateformes compatibles avec le format.
    const kind = mediaKind(b.format);
    const targets = [...new Set(b.platforms)].filter((p) => platforms[p]?.formats.includes(kind));
    return insert.run(st.phase.id, b.format, b.angle, b.theme, b.hook, b.rationale,
      JSON.stringify(targets.length ? targets : ['discord'])).lastInsertRowid;
  });
  log(`stratège : ${ids.length} briefs — ${out.learnings}`);
  return ids;
}

// ── 2. Rédacteur ─────────────────────────────────────────────────────────
export async function write(briefId) {
  const b = db.prepare('SELECT * FROM briefs WHERE id = ?').get(briefId);
  const st = campaignState();
  const user = `Date : ${st.day}. Phase : « ${st.phase.label} » — ${st.phase.objective}
Ouverture du serveur : ${st.openingLabel} (${st.isOpen ? 'déjà ouvert' : `J-${st.daysLeft}`}).

Brief :
- format : ${b.format}
- angle : ${b.angle}
- élément du lore : ${b.theme}
- idée / accroche : ${b.hook}
- plateformes (une légende pour chacune) : ${json(b.platforms, []).join(', ')}
${b.format === 'short' ? '' : `- gabarit du visuel : ${b.format === 'texte' ? 'au choix (sert d\'illustration)' : b.format}`}

Écris le contenu.`;

  try {
    const content = await generateJSON({ purpose: 'redaction', system: writerSystem(), user, schema: writerSchema(), effort: 'medium' });
    const postId = savePost(b, content);
    db.prepare(`UPDATE briefs SET status = 'written' WHERE id = ?`).run(briefId);
    log(`rédacteur : post #${postId} « ${content.title} »`);
    return postId;
  } catch (e) {
    db.prepare(`UPDATE briefs SET status = 'failed' WHERE id = ?`).run(briefId);
    throw e;
  }
}

export function savePost(brief, content) {
  const captions = Object.fromEntries(content.captions.map((c) => [c.platform, c]));
  const { lastInsertRowid: postId } = db.prepare(`INSERT INTO posts (brief_id, phase, format, angle, theme, title, content, captions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(brief.id ?? null, brief.phase, brief.format, brief.angle, brief.theme, content.title, JSON.stringify(content), JSON.stringify(captions));
  const addPub = db.prepare('INSERT OR IGNORE INTO publications (post_id, platform, code) VALUES (?, ?, ?)');
  for (const platform of Object.keys(captions)) addPub.run(postId, platform, postCode(postId, platform));
  return Number(postId);
}

// ── 3. Studio ────────────────────────────────────────────────────────────
function visualData(v, st, campaign) {
  const d = { ...v, cta: campaign.display_link, disclaimer: `${campaign.server_name} · serveur RP FiveM · fiction` };
  if (v.template === 'countdown') d.figure = st.isOpen ? 'OUVERT' : st.daysLeft === 0 ? 'CE SOIR' : `J-${st.daysLeft}`;
  if (v.corp === 'none') d.corp = '';
  return d;
}

export async function produce(postId) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  const content = json(post.content);
  const campaign = loadCampaign();
  const st = campaignState();
  const dir = path.join(MEDIA_DIR, `post-${postId}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  db.prepare(`UPDATE posts SET status = 'rendering', error = NULL WHERE id = ?`).run(postId);

  try {
    const media = [];
    const cover = visualData(content.visual, st, campaign);
    media.push({ kind: 'image', ratio: '4:5', file: await renderPNG(cover.template, cover, 'portrait', path.join(dir, 'visuel-4x5.png')) });
    media.push({ kind: 'image', ratio: '9:16', file: await renderPNG(cover.template, cover, 'story', path.join(dir, 'visuel-9x16.png')) });

    if (post.format === 'short' && content.scenes?.length) {
      const scenes = [];
      for (const [i, s] of content.scenes.entries()) {
        const d = visualData(s, st, campaign);
        scenes.push({ image: await renderPNG(d.template, d, 'story', path.join(dir, `scene-${i + 1}.png`)), seconds: s.seconds });
      }
      const end = { headline: 'Rejoignez l\'État du Sud', body: `${campaign.server_name} — serveur RP FiveM francophone`,
        cta: campaign.display_link, figure: st.isOpen ? 'Frontières ouvertes' : `Ouverture : ${st.openingLabel}` };
      scenes.push({ image: await renderPNG('endcard', end, 'story', path.join(dir, 'scene-fin.png')), seconds: 3 });

      const voice = await synthesize(content.voiceover, path.join(dir, 'voix'));
      const video = await buildShort({ scenes, voice, outFile: path.join(dir, 'short-9x16.mp4'), workDir: path.join(dir, 'work') });
      media.unshift({ kind: 'video', ratio: '9:16', file: video.file, seconds: video.seconds, voice: Boolean(voice) });
    }

    const rel = media.map((m) => ({ ...m, file: path.relative(MEDIA_DIR, m.file) }));
    db.prepare(`UPDATE posts SET status = 'ready', media = ? WHERE id = ?`).run(JSON.stringify(rel), postId);
    log(`studio : post #${postId} rendu (${rel.map((m) => m.kind).join(', ')})`);
  } catch (e) {
    db.prepare(`UPDATE posts SET status = 'draft', error = ? WHERE id = ?`).run(String(e.message || e), postId);
    throw e;
  }
}

// ── Tournée quotidienne ──────────────────────────────────────────────────
let running = false;
export async function dailyRun(count) {
  if (running) throw new Error('Une génération est déjà en cours');
  running = true;
  const done = [];
  try {
    const briefIds = await plan(count);
    for (const id of briefIds) {
      try {
        const postId = await write(id);
        await produce(postId);
        done.push(postId);
      } catch (e) {
        log(`échec brief #${id} : ${e.message}`);
      }
    }
  } finally {
    running = false;
    await closeBrowser();
  }
  return done;
}

export const isRunning = () => running;
