import { db, json } from './db.js';

/** Statistiques consolidées : clics (auto), arrivées Discord (auto), vues (saisie manuelle). */
export function computeStats({ days = 30 } = {}) {
  const since = `-${days} days`;
  const posts = db.prepare(`SELECT id, created_at, format, angle, theme, title, status FROM posts
                            WHERE created_at >= datetime('now', ?) AND status IN ('approved','published')`).all(since);

  const clicksByCode = Object.fromEntries(db.prepare(`SELECT code, COUNT(DISTINCT ip_hash) n FROM clicks
                            WHERE at >= datetime('now', ?) GROUP BY code`).all(since).map((r) => [r.code, r.n]));
  const joinsByPlatform = Object.fromEntries(db.prepare(`SELECT platform, COUNT(*) n, SUM(left_at IS NOT NULL) left_n FROM joins
                            WHERE at >= datetime('now', ?) GROUP BY platform`).all(since).map((r) => [r.platform, r]));
  const pubs = db.prepare(`SELECT * FROM publications WHERE post_id IN (SELECT id FROM posts WHERE created_at >= datetime('now', ?))`).all(since);

  // Clics totaux par plateforme (liens de posts + lien en bio) pour répartir les arrivées.
  const clicksByPlatform = {};
  for (const p of pubs) clicksByPlatform[p.platform] = (clicksByPlatform[p.platform] || 0) + (clicksByCode[p.code] || 0);
  for (const pl of Object.keys(joinsByPlatform)) clicksByPlatform[pl] = (clicksByPlatform[pl] || 0) + (clicksByCode[pl] || 0);

  const perPost = posts.map((post) => {
    const mine = pubs.filter((p) => p.post_id === post.id);
    let clicks = 0, views = 0, joins = 0;
    for (const p of mine) {
      const c = clicksByCode[p.code] || 0;
      clicks += c;
      views += p.views || 0;
      const total = clicksByPlatform[p.platform] || 0;
      // Attribution : les arrivées d'une plateforme sont réparties au prorata des clics.
      if (total > 0) joins += (joinsByPlatform[p.platform]?.n || 0) * (c / total);
    }
    // Score : une arrivée vaut 10 clics ; les vues départagent quand il n'y a pas encore de clic.
    const score = joins * 10 + clicks + views / 1000;
    return { ...post, clicks, views, joins: Math.round(joins * 10) / 10, score: Math.round(score * 10) / 10,
      published_on: mine.filter((p) => p.published_at).map((p) => p.platform) };
  });

  const group = (key) => {
    const out = {};
    for (const p of perPost) {
      const g = (out[p[key]] ||= { [key]: p[key], posts: 0, clicks: 0, joins: 0, views: 0, score: 0 });
      g.posts++; g.clicks += p.clicks; g.joins += p.joins; g.views += p.views; g.score += p.score;
    }
    return Object.values(out).map((g) => ({ ...g, avg_score: Math.round((g.score / g.posts) * 10) / 10 }))
      .sort((a, b) => b.avg_score - a.avg_score);
  };

  const platforms = Object.entries(joinsByPlatform).map(([platform, r]) => ({
    platform, joins: r.n, left: r.left_n, bio_clicks: clicksByCode[platform] || 0, clicks: clicksByPlatform[platform] || 0,
  }));

  const totals = {
    posts: perPost.length,
    clicks: Object.values(clicksByCode).reduce((a, b) => a + b, 0),
    joins: Object.values(joinsByPlatform).reduce((a, r) => a + r.n, 0),
    unattributed_joins: db.prepare(`SELECT COUNT(*) n FROM joins WHERE platform IS NULL AND at >= datetime('now', ?)`).get(since).n,
  };

  return {
    totals,
    byAngle: group('angle'),
    byFormat: group('format'),
    platforms,
    top: [...perPost].sort((a, b) => b.score - a.score).slice(0, 5),
    perPost,
  };
}

/** Meilleurs contenus des 7 derniers jours : candidats pour le budget pub. */
export function boostCandidates() {
  return computeStats({ days: 7 }).top.filter((p) => p.score > 0).slice(0, 3);
}

export function lastLearnings() {
  const r = db.prepare('SELECT summary FROM insights ORDER BY id DESC LIMIT 1').get();
  return json(r?.summary)?.learnings ?? null;
}
