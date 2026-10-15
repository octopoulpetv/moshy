// Éléments graphiques du trailer « Bureau d'accueil » : écran du pupitre (images + animation),
// invite d'interaction, carton final 9:16 et 16:9. Ils s'incrustent au montage par-dessus les images de jeu.
//
// Usage (depuis ministere/) :
//   node campagne/trailer-accueil/build-assets.mjs
//   DISCORD_LINK="discord.gg/xxxx" node campagne/trailer-accueil/build-assets.mjs   ← quand le lien est connu
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { seal } from '../../src/studio/templates.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'assets');
fs.mkdirSync(OUT, { recursive: true });
const LINK = process.env.DISCORD_LINK || '[LIEN DISCORD À RENSEIGNER]';

const font = (pkg, file) => pathToFileURL(path.join(ROOT, 'node_modules', '@fontsource', pkg, file)).href;
const FONTS = [font('oswald', '500.css'), font('oswald', '700.css'), font('ibm-plex-mono', '400.css'), font('ibm-plex-mono', '600.css'),
  font('ibm-plex-sans', '400.css'), font('ibm-plex-sans', '600.css')].map((f) => `<link rel="stylesheet" href="${f}">`).join('');

const SEEK = `<script>
window.__seek = (t) => {
  document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
  document.querySelectorAll('[data-progress]').forEach((el) => {
    const k = Math.min(1, Math.max(0, (t - +el.dataset.from) / +el.dataset.dur));
    el.style.width = (k * 100).toFixed(1) + '%';
    const label = document.querySelector(el.dataset.label);
    if (label) label.textContent = Math.round(k * 100) + ' %';
  });
};
</script>`;

const page = (w, h, css, body, transparent = false) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}
<style>*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : '#08090d'}}
body{font-family:'IBM Plex Sans',sans-serif;-webkit-font-smoothing:antialiased;color:#e9eef2}
:root{--cyan:#5fd4ff;--ink:#e9eef2;--dim:#7d8b96;--e:cubic-bezier(.2,.8,.2,1)}
@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes out{from{opacity:1}to{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
${css}</style></head><body>${body}${SEEK}</body></html>`;

// ── 1. Écran du pupitre (1600×1000, à afficher sur l'écran en jeu ou à incruster) ──
function pupitre(state) {
  const status = {
    attente: `<div class="st"><i class="dot"></i>STATUT : IDENTIFICATION EN ATTENTE</div>
      <div class="hint">Veuillez vous présenter devant le pupitre.</div>`,
    scan: `<div class="st"><i class="dot on"></i>IDENTIFICATION EN COURS</div>
      <div class="bar"><b data-progress data-from="1.2" data-dur="1.4" data-label="#pct"></b></div><div class="pct" id="pct">0 %</div>`,
    ouvert: `<div class="st ok">DOSSIER N° 2026-04817 — OUVERT</div>
      <div class="hint">Le Gouverneur va vous recevoir.</div>`,
  }[state];
  return page(1600, 1000, `
body{background:radial-gradient(120% 90% at 30% 10%,#13202b 0%,#0a0f14 60%,#06080b 100%)}
.frame{position:absolute;inset:36px;border:1px solid #5fd4ff33;border-radius:18px}
.hd{position:absolute;top:80px;left:110px;right:110px;display:flex;align-items:center;gap:36px}
.hd .t b{display:block;font:700 64px Oswald;letter-spacing:.14em}
.hd .t span{font:600 22px 'IBM Plex Mono';letter-spacing:.22em;color:var(--dim)}
.line{position:absolute;left:110px;right:110px;top:300px;height:1px;background:linear-gradient(90deg,#5fd4ff88,#5fd4ff00)}
.body{position:absolute;left:110px;right:110px;top:300px;bottom:150px;display:flex;flex-direction:column;justify-content:center}
.st{font:600 58px 'IBM Plex Mono';letter-spacing:.06em;display:flex;align-items:center;gap:26px}
.st.ok{color:var(--cyan)}
.dot{width:22px;height:22px;border-radius:50%;background:#f0b44a;animation:pulse 1.1s ease-in-out infinite}
.dot.on{background:var(--cyan);animation-duration:.5s}
.hint{margin-top:40px;font:400 42px 'IBM Plex Sans';color:#b9c6cf}
.bar{margin-top:50px;height:10px;background:#ffffff14;border-radius:5px;overflow:hidden}
.bar b{display:block;height:100%;width:0;background:var(--cyan);box-shadow:0 0 18px var(--cyan)}
.pct{margin-top:18px;font:400 26px 'IBM Plex Mono';color:var(--dim)}
.ft{position:absolute;left:110px;right:110px;bottom:80px;display:flex;justify-content:space-between;font:400 22px 'IBM Plex Mono';letter-spacing:.12em;color:#5d6b75}`,
  `<div class="frame"></div>
  <div class="hd">${seal(170, '#5fd4ff')}<div class="t"><b>THE EMPIRE RP</b><span>BUREAU D'ACCUEIL DES NOUVEAUX RÉSIDENTS</span></div></div>
  <div class="line"></div><div class="body">${status}</div>
  <div class="ft"><span>ÉTAT DU SUD — LOS SANTOS</span><span>GUICHET 01</span></div>`);
}

// ── 2. Invite d'interaction (fond transparent) ──
const prompt = page(1100, 190, `
.p{position:absolute;inset:20px;display:flex;align-items:center;gap:30px;padding:0 34px;background:rgba(8,12,16,.78);
  border:1px solid #5fd4ff55;border-radius:20px;box-shadow:0 0 30px #5fd4ff22}
.k{width:96px;height:96px;border:3px solid #e9eef2;border-radius:16px;display:grid;place-items:center;font:600 54px 'IBM Plex Mono'}
.l{font:600 48px 'IBM Plex Sans';letter-spacing:.01em}`,
  `<div class="p"><div class="k">E</div><div class="l">Découvrir votre nouvelle vie</div></div>`, true);

// ── 3. Carton final (animé, 5 s) ──
function carton(w, h) {
  const tall = h > w;
  return page(w, h, `
body{background:radial-gradient(80% 60% at 50% ${tall ? 42 : 45}%,#121722 0%,#08090d 70%);display:grid;place-items:center;text-align:center}
.w{display:flex;flex-direction:column;align-items:center;gap:${tall ? 46 : 30}px;padding:0 70px}
.s{animation:fade 1s ease .1s both}
h1{font:700 ${tall ? 112 : 120}px Oswald;letter-spacing:.1em;white-space:nowrap;animation:rise .8s var(--e) .5s both}
.tag{font:600 ${tall ? 40 : 34}px 'IBM Plex Sans';letter-spacing:.08em;line-height:1.45;color:#d8e2e8;animation:rise .8s var(--e) 1s both}
.rule{width:${tall ? 520 : 460}px;height:2px;background:var(--cyan);transform-origin:center;animation:grow .7s var(--e) 1.5s both}
.cta{font:400 ${tall ? 36 : 30}px 'IBM Plex Sans';color:#b9c6cf;animation:fade .7s ease 1.7s both}
.link{font:600 ${tall ? 40 : 34}px 'IBM Plex Mono';color:var(--cyan);animation:fade .7s ease 2.1s both}`,
  `<div class="w"><div class="s">${seal(tall ? 230 : 170, '#5fd4ff')}</div><h1>THE EMPIRE RP</h1>
  <div class="tag">VOTRE HISTOIRE COMMENCE${tall ? '<br>' : ' '}À LA FRONTIÈRE.</div><div class="rule"></div>
  <div class="cta">Rejoignez le Discord — Passez la douane</div><div class="link">${LINK}</div></div>`);
}

// ── Rendu ──
const browser = await chromium.launch({
  executablePath: [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium'].find((p) => p && fs.existsSync(p)),
});
const tmp = path.join(OUT, '.tmp.html');

async function open(html, w, h) {
  fs.writeFileSync(tmp, html);
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(pathToFileURL(tmp).href);
  await p.evaluate(() => document.fonts.ready);
  return p;
}
async function still(html, w, h, file, t = 60, omitBackground = false) {
  const p = await open(html, w, h);
  await p.evaluate((t) => window.__seek(t), t);
  await p.screenshot({ path: path.join(OUT, file), omitBackground });
  await p.close();
}
async function clip(htmls, w, h, seconds, file, fps = 30) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, file)]);
  const done = new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg')) : r())));
  const pages = [];
  for (const h2 of htmls) pages.push(await open(h2.html, w, h));
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    const t = i / fps;
    const idx = htmls.findLastIndex((x) => t >= x.from);
    await pages[idx].evaluate((t) => window.__seek(t), t);
    const png = await pages[idx].screenshot();
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  for (const p of pages) await p.close();
}

for (const s of ['attente', 'scan', 'ouvert']) await still(pupitre(s), 1600, 1000, `pupitre-${s}.png`, s === 'scan' ? 2.0 : 0);
await clip([{ from: 0, html: pupitre('attente') }, { from: 1.2, html: pupitre('scan') }, { from: 2.6, html: pupitre('ouvert') }],
  1600, 1000, 4, 'pupitre-sequence.mp4');
await still(prompt, 1100, 190, 'invite-E.png', 60, true);
await clip([{ from: 0, html: carton(1080, 1920) }], 1080, 1920, 5, 'carton-final-9x16.mp4');
await clip([{ from: 0, html: carton(1920, 1080) }], 1920, 1080, 5, 'carton-final-16x9.mp4');
await still(carton(1080, 1920), 1080, 1920, 'carton-final-9x16.png');
fs.rmSync(tmp, { force: true });
await browser.close();
console.log('Éléments écrits dans', OUT);
