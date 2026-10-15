import crypto from 'node:crypto';
import { config, loadCampaign } from './config.js';
import { db } from './db.js';

const PREFIX = { tiktok: 'tk', youtube: 'yt', instagram: 'ig', x: 'x', facebook: 'fb', reddit: 'rd', discord: 'dc' };

/** Lien court tracké propre à un post et une plateforme : /go/x12 */
export const postCode = (postId, platform) => `${PREFIX[platform] || platform}${postId}`;
/** Lien « en bio », permanent par plateforme : /go/tiktok */
export const bioCode = (platform) => platform;

export const shortUrl = (code) => `${config.publicUrl}/go/${code}`;

/** Résout un code vers l'invitation Discord de la bonne plateforme. */
export function resolve(code) {
  const platforms = Object.keys(loadCampaign().platforms);
  let platform = platforms.includes(code) ? code : null;
  if (!platform) {
    const pub = db.prepare('SELECT platform FROM publications WHERE code = ?').get(code);
    platform = pub?.platform ?? null;
  }
  if (!platform && code !== 'site') return null;
  const inv = platform && db.prepare('SELECT url FROM invites WHERE platform = ?').get(platform);
  return inv?.url || config.discord.fallbackInvite || null;
}

export function recordClick(code, req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  // IP hachée avec sel journalier : on compte les visiteurs uniques sans stocker de donnée personnelle.
  const salt = new Date().toISOString().slice(0, 10);
  const ipHash = crypto.createHash('sha256').update(salt + ip).digest('hex').slice(0, 16);
  db.prepare('INSERT INTO clicks (code, ua, ref, ip_hash) VALUES (?, ?, ?, ?)')
    .run(code, (req.headers['user-agent'] || '').slice(0, 200), (req.headers.referer || '').slice(0, 200), ipHash);
}

/** Légende finale : remplace {LIEN} par le lien tracké et ajoute les hashtags. */
export function finalCaption(post, caption) {
  const c = loadCampaign();
  const p = c.platforms[caption.platform];
  const link = p?.clickable_links ? shortUrl(postCode(post.id, caption.platform)) : '';
  let text = caption.text.replace(/\{LIEN\}/g, link || 'lien en bio');
  const tags = (caption.hashtags || []).slice(0, p?.hashtags ?? 5).map((h) => '#' + h.replace(/^#/, '').replace(/\s+/g, ''));
  if (tags.length) text += '\n\n' + tags.join(' ');
  return text;
}
