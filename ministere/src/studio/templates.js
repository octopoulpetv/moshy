// Gabarits visuels de l'État du Sud. Chaque gabarit renvoie une page HTML complète
// rendue par Chromium à la taille exacte du visuel (1080×1350 ou 1080×1920).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../config.js';

const font = (pkg, file) => pathToFileURL(path.join(ROOT, 'node_modules', '@fontsource', pkg, file)).href;

const FONTS = [
  font('oswald', '500.css'), font('oswald', '700.css'),
  font('ibm-plex-mono', '400.css'), font('ibm-plex-mono', '600.css'),
  font('ibm-plex-serif', '400.css'), font('ibm-plex-serif', '400-italic.css'), font('ibm-plex-serif', '600.css'),
  font('ibm-plex-sans', '400.css'), font('ibm-plex-sans', '600.css'),
];

export const ACCENTS = {
  rouge: '#b3261e',
  or: '#c9a227',
  bleu: '#2b4f7e',
  vert: '#2e6b55',
};

export const CORPS = {
  kronos:    { name: 'KRONOS',    a: '#0f1115', b: '#3a3f4b', ink: '#f2efe6', accent: '#c9a227', mark: '◴' },
  aethernet: { name: 'AETHERNET', a: '#06182b', b: '#0d4a7a', ink: '#e9f4ff', accent: '#5fd4ff', mark: '◉' },
  helix:     { name: 'HELIX',     a: '#0b1f17', b: '#1d5c45', ink: '#ecfbf3', accent: '#7cf2b8', mark: '✣' },
};

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const para = (s = '') => esc(s).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

/** Sceau officiel de l'État du Sud (SVG). */
export function seal(size = 180, color = '#b3261e') {
  const r = 50;
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs><path id="ring" d="M60,60 m-${r - 8},0 a${r - 8},${r - 8} 0 1,1 ${(r - 8) * 2},0 a${r - 8},${r - 8} 0 1,1 -${(r - 8) * 2},0"/></defs>
  <circle cx="60" cy="60" r="${r + 6}" fill="none" stroke="${color}" stroke-width="3"/>
  <circle cx="60" cy="60" r="${r - 1}" fill="none" stroke="${color}" stroke-width="1"/>
  <circle cx="60" cy="60" r="${r - 17}" fill="none" stroke="${color}" stroke-width="1.5"/>
  <text font-family="IBM Plex Mono" font-weight="600" font-size="8.4" fill="${color}">
    <textPath href="#ring" textLength="258" lengthAdjust="spacing">ÉTAT DU SUD • ORDRE • REFONDATION •</textPath></text>
  <g fill="${color}">
    <rect x="52" y="44" width="16" height="3"/><rect x="54" y="48" width="3" height="18"/>
    <rect x="58.5" y="48" width="3" height="18"/><rect x="63" y="48" width="3" height="18"/>
    <rect x="50" y="67" width="20" height="3"/><rect x="47" y="72" width="26" height="3"/>
    <polygon points="60,32 62,38 68,38 63,41.5 65,47 60,43.5 55,47 57,41.5 52,38 58,38" transform="translate(0,-2) scale(1)"/>
  </g></svg>`;
}

const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
)}")`;

function page({ w, h, css, body }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
${FONTS.map((f) => `<link rel="stylesheet" href="${f}">`).join('\n')}
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:'IBM Plex Sans',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.grain{position:absolute;inset:0;background-image:${NOISE};opacity:.22;mix-blend-mode:multiply;pointer-events:none}
.grain.light{opacity:.06}
.cta{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:center;
  padding:22px 60px;font-family:'IBM Plex Mono';font-size:22px;letter-spacing:.06em;text-transform:uppercase}
p+p{margin-top:.7em}
:root{--e:cubic-bezier(.2,.8,.2,1)}
.stage{position:absolute;inset:0;transform-origin:50% 45%;animation:push 9s linear both}
body.static .mv{animation:none!important}
@keyframes push{from{transform:scale(1)}to{transform:scale(1.05)}}
@keyframes rise{from{opacity:0;transform:translateY(46px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{opacity:0;transform:scale(.6)}70%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes thump{0%{opacity:0;transform:scale(1.7)}60%{opacity:1;transform:scale(.97)}100%{opacity:1;transform:scale(1)}}
@keyframes slam{0%{opacity:0;transform:rotate(-11deg) scale(2.6)}55%{opacity:.95;transform:rotate(-11deg) scale(.94)}100%{opacity:.82;transform:rotate(-11deg) scale(1)}}
@keyframes type{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes wipe{from{background-size:0% 100%}to{background-size:100% 100%}}
@keyframes growx{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes spin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(40deg)}}
@keyframes spin2{to{transform:rotate(90deg)}}
@keyframes marker{from{left:-3px}to{left:calc(var(--to) - 3px)}}
${css}
</style></head><body>${wrapStage(body)}
<script>
// Le moteur vidéo pilote le temps image par image : aucune animation ne tourne seule.
window.__seek = function (t) {
  document.getAnimations().forEach(function (a) { a.pause(); a.currentTime = t * 1000; });
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var k = Math.min(1, Math.max(0, (t - +el.dataset.delay) / +el.dataset.dur));
    el.textContent = Math.round(+el.dataset.count * (1 - Math.pow(1 - k, 3)));
  });
};
// Image fixe : état final, sans mouvement de caméra.
window.__static = function () { document.body.classList.add('static'); window.__seek(60); };
</script></body></html>`;
}

/** Tout passe dans la « scène » qui avance lentement, sauf le bandeau du bas qui reste fixe. */
function wrapStage(body) {
  const m = body.match(/<div class="cta"[\s\S]*?<\/span><\/div>/);
  const cta = m ? m[0] : '';
  return `<div class="stage mv">${body.replace(cta, '')}</div>${cta}`;
}

const ctaBar = (d, fg, bg) => `<div class="cta" style="color:${fg};background:${bg}">
  <span>${esc(d.cta || 'Rejoindre : lien en bio')}</span><span>${esc(d.disclaimer || 'THE EMPIRE · serveur RP FiveM')}</span></div>`;

// ── 1. Affiche de propagande ────────────────────────────────────────────
function affiche(d, { w, h }) {
  const accent = ACCENTS[d.accent] || ACCENTS.rouge;
  const tall = h > w * 1.4;
  const size = fitHeadline(d.headline, tall ? 168 : 148, tall ? 9 : 10);
  return page({ w, h, css: `
body{background:#15171b;color:#efe8d8}
.rays{position:absolute;left:50%;top:${tall ? 44 : 40}%;width:${w * 2.6}px;height:${w * 2.6}px;transform:translate(-50%,-50%);
  background:repeating-conic-gradient(from 0deg, ${accent} 0deg 7deg, transparent 7deg 18deg);opacity:.9;
  -webkit-mask:radial-gradient(circle, transparent 0 ${w * 0.17}px, #000 ${w * 0.171}px 40%, transparent 62%)}
.disc{position:absolute;left:50%;top:${tall ? 44 : 40}%;transform:translate(-50%,-50%);width:${w * 0.34}px;height:${w * 0.34}px;
  border-radius:50%;background:#efe8d8;display:grid;place-items:center;box-shadow:0 0 0 14px #15171b, 0 0 0 18px ${accent}}
.top{position:absolute;top:56px;left:60px;right:60px;display:flex;justify-content:space-between;
  font-family:'IBM Plex Mono';font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:#cfc6b2}
.bottom{position:absolute;left:60px;right:60px;bottom:${tall ? 150 : 96}px}
h1{font-family:Oswald;font-weight:700;text-transform:uppercase;font-size:${size}px;line-height:1.1;letter-spacing:-.005em;color:#f4ecd9}
h1 em{font-style:normal;color:#15171b;background:linear-gradient(transparent 9%, ${accent} 9%, ${accent} 93%, transparent 93%);padding:0 .08em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.veil{position:absolute;left:0;right:0;bottom:0;height:${tall ? 62 : 66}%;background:linear-gradient(to top,#15171b 0%,#15171b 62%,rgba(21,23,27,.85) 78%,transparent 100%)}
.body{margin-top:26px;font-family:'IBM Plex Serif';font-size:${tall ? 44 : 31}px;line-height:1.38;color:#d9d0bd;max-width:940px}
.foot{margin-top:24px;font-family:'IBM Plex Mono';font-size:19px;color:#9b937f;letter-spacing:.04em}
.rays{animation:spin 16s linear both}
.disc svg{animation:pop .7s var(--e) .1s both}
.top{animation:fade .5s ease .1s both}
h1{animation:rise .55s var(--e) .1s both}
h1 em{background-repeat:no-repeat;animation:wipe .4s var(--e) .65s both}
.body{animation:rise .6s var(--e) .9s both}
.foot{animation:fade .6s ease 1.3s both}`,
  body: `<div class="rays mv"></div><div class="veil"></div><div class="disc">${seal(w * 0.27, accent)}</div>
<div class="top"><span>${esc(d.kicker)}</span><span>${esc(d.stamp || '')}</span></div>
<div class="bottom"><h1>${emph(d.headline)}</h1>
${d.body ? `<div class="body">${para(d.body)}</div>` : ''}${d.footer ? `<div class="foot">${esc(d.footer)}</div>` : ''}</div>
<div class="grain"></div>${ctaBar(d, '#15171b', accent)}` });
}

// ── 2. Communiqué / décret officiel ─────────────────────────────────────
function communique(d, { w, h }) {
  const accent = ACCENTS[d.accent] || ACCENTS.rouge;
  const tall = h > w * 1.4;
  return page({ w, h, css: `
body{background:#e9e2d0;color:#1d1c19}
.sheet{position:absolute;inset:44px 44px ${tall ? 120 : 92}px 44px;background:#f6f1e3;box-shadow:0 2px 0 #d8cfb8, 0 18px 40px rgba(0,0,0,.18);
  padding:${tall ? 80 : 56}px 70px;overflow:hidden}
.head{display:flex;gap:30px;align-items:center;border-bottom:3px double #1d1c19;padding-bottom:26px}
.inst{font-family:'IBM Plex Mono';text-transform:uppercase;letter-spacing:.14em;font-size:21px;line-height:1.5}
.inst b{display:block;font-family:Oswald;font-weight:500;font-size:40px;letter-spacing:.06em}
.ref{margin-top:26px;display:flex;justify-content:space-between;font-family:'IBM Plex Mono';font-size:20px;color:#55503f;letter-spacing:.05em}
h1{margin-top:${tall ? 64 : 40}px;font-family:'IBM Plex Serif';font-weight:600;font-size:${fitHeadline(d.headline, tall ? 104 : 60, 24)}px;line-height:1.12}
.body{margin-top:${tall ? 56 : 30}px;font-family:'IBM Plex Serif';font-size:${tall ? 50 : 29}px;line-height:1.5;color:#2b2922}
.sign{position:absolute;left:70px;bottom:${tall ? 80 : 56}px;font-family:'IBM Plex Serif';font-style:italic;font-size:${tall ? 32 : 26}px;color:#3b382e}
.sign small{display:block;font-style:normal;font-family:'IBM Plex Mono';font-size:18px;letter-spacing:.1em;color:#6d6754;margin-top:6px}
.stamp{position:absolute;right:70px;bottom:${tall ? 190 : 40}px;transform:rotate(-11deg);border:6px solid ${accent};color:${accent};
  padding:10px 26px;font-family:Oswald;font-weight:700;font-size:${tall ? 72 : 54}px;letter-spacing:.12em;text-transform:uppercase;opacity:.82;
  mix-blend-mode:multiply;border-radius:8px}
.sheet{animation:rise .6s var(--e) 0s both}
.head{animation:fade .5s ease .25s both}
.ref{animation:fade .5s ease .4s both}
h1{animation:rise .6s var(--e) .55s both}
.body{animation:type 1.6s linear 1s both}
.sign{animation:fade .5s ease 2.4s both}
.stamp{animation:slam .45s cubic-bezier(.3,1.4,.5,1) 2.8s both}`,
  body: `<div class="sheet">
<div class="head">${seal(120, '#1d1c19')}<div class="inst"><b>ÉTAT DU SUD</b>${esc(d.kicker || 'Administration de la Refondation')}</div></div>
<div class="ref"><span>${esc(d.figure || 'Réf. ADM/2026')}</span><span>Los Santos, an IV de la Refondation</span></div>
<h1>${esc(d.headline)}</h1><div class="body">${para(d.body)}</div>
<div class="sign">${esc(d.footer || 'Pour le Gouverneur, L. Van-Ranke')}<small>Document à valeur administrative</small></div>
${d.stamp ? `<div class="stamp">${esc(d.stamp)}</div>` : ''}<div class="grain light"></div></div>
${ctaBar(d, '#f6f1e3', '#1d1c19')}` });
}

// ── 3. Publicité du Cartel (Kronos / Aethernet / Helix) ─────────────────
function corpo(d, { w, h }) {
  const c = CORPS[d.corp] || CORPS.kronos;
  const tall = h > w * 1.4;
  return page({ w, h, css: `
body{background:radial-gradient(120% 90% at 70% 20%, ${c.b} 0%, ${c.a} 65%);color:${c.ink}}
.orb{position:absolute;right:-140px;top:${tall ? 260 : 120}px;width:720px;height:720px;border-radius:50%;
  background:radial-gradient(circle at 35% 35%, ${c.accent}55, transparent 60%);filter:blur(4px)}
.ring{position:absolute;right:40px;top:${tall ? 380 : 230}px;width:460px;height:460px;border-radius:50%;border:2px solid ${c.accent}66}
.ring::after{content:'';position:absolute;inset:60px;border-radius:50%;border:1px solid ${c.accent}44}
.brand{position:absolute;top:70px;left:70px;font-family:'IBM Plex Sans';font-weight:600;font-size:40px;letter-spacing:.42em}
.brand i{font-style:normal;color:${c.accent};margin-right:16px}
.k{position:absolute;top:140px;left:72px;font-family:'IBM Plex Mono';font-size:20px;letter-spacing:.2em;color:${c.ink}99;text-transform:uppercase}
.main{position:absolute;left:70px;right:70px;bottom:${tall ? 260 : 170}px}
h1{font-family:'IBM Plex Sans';font-weight:600;font-size:${fitHeadline(d.headline, tall ? 104 : 92, 16)}px;line-height:1.02;letter-spacing:-.02em}
.body{margin-top:28px;font-size:${tall ? 42 : 31}px;line-height:1.45;color:${c.ink}cc;max-width:900px}
.legal{position:absolute;left:70px;right:70px;bottom:${tall ? 130 : 90}px;font-size:${tall ? 21 : 16}px;line-height:1.45;color:${c.ink}77;font-family:'IBM Plex Mono'}
.orb{animation:fade 1.4s ease 0s both}
.ring{animation:spin2 20s linear both}
.brand{animation:rise .6s var(--e) .15s both}
.k{animation:fade .6s ease .4s both}
h1{animation:rise .7s var(--e) .6s both}
.body{animation:rise .7s var(--e) 1s both}
.legal{animation:fade .8s ease 1.6s both}`,
  body: `<div class="orb"></div><div class="ring mv"></div>
<div class="brand"><i>${c.mark}</i>${c.name}</div><div class="k">${esc(d.kicker)}</div>
<div class="main"><h1>${esc(d.headline)}</h1>${d.body ? `<div class="body">${para(d.body)}</div>` : ''}</div>
<div class="legal">${esc(d.footer || '')}</div>${ctaBar(d, c.a, c.accent)}` });
}

// ── 4. Compte à rebours ─────────────────────────────────────────────────
function countdown(d, { w, h }) {
  const accent = ACCENTS[d.accent] || ACCENTS.rouge;
  const tall = h > w * 1.4;
  return page({ w, h, css: `
body{background:#101215;color:#efe8d8}
.band{position:absolute;left:0;right:0;top:${tall ? 300 : 210}px;height:${tall ? 760 : 620}px;background:${accent}}
.top{position:absolute;top:70px;left:60px;right:60px;display:flex;align-items:center;gap:26px;font-family:'IBM Plex Mono';
  font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:#cfc6b2}
.num{position:absolute;left:0;right:0;top:${tall ? 300 : 210}px;height:${tall ? 760 : 620}px;display:grid;place-items:center;
  font-family:Oswald;font-weight:700;font-size:${tall ? 520 : 440}px;line-height:1;color:#101215;letter-spacing:-.03em}
.under{position:absolute;left:60px;right:60px;top:${tall ? 1110 : 868}px}
h1{font-family:Oswald;font-weight:700;font-size:${fitHeadline(d.headline, tall ? 112 : 92, 18)}px;text-transform:uppercase;line-height:.98}
.body{margin-top:24px;font-family:'IBM Plex Serif';font-size:${tall ? 44 : 31}px;color:#cfc6b2;line-height:1.4}
.top{animation:fade .5s ease 0s both}
.band{transform-origin:left;animation:growx .55s var(--e) .1s both}
.num{animation:thump .6s var(--e) .55s both}
h1{animation:rise .6s var(--e) 1s both}
.body{animation:rise .6s var(--e) 1.3s both}`,
  body: `<div class="top">${seal(90, '#cfc6b2')}<span>${esc(d.kicker)}</span></div>
<div class="band"></div><div class="num">${esc(d.figure || 'J-?')}</div>
<div class="under"><h1>${esc(d.headline)}</h1>${d.body ? `<div class="body">${para(d.body)}</div>` : ''}</div>
<div class="grain"></div>${ctaBar(d, '#101215', '#efe8d8')}` });
}

// ── 5. Fiche de crédit civique ──────────────────────────────────────────
function fiche(d, { w, h }) {
  const accent = ACCENTS[d.accent] || ACCENTS.bleu;
  const tall = h > w * 1.4;
  const score = parseInt(String(d.figure || '').replace(/\D/g, ''), 10);
  const pct = Number.isFinite(score) ? Math.max(0, Math.min(1, score / 1000)) : 0.6;
  return page({ w, h, css: `
body{background:#d9d4c7;color:#1b1d21}
.card{position:absolute;inset:${tall ? 150 : 70}px 60px ${tall ? 200 : 120}px 60px;background:#f4f1ea;border-radius:22px;overflow:hidden;
  box-shadow:0 20px 50px rgba(0,0,0,.22)}
.hd{background:${accent};color:#f4f1ea;padding:34px 46px;display:flex;align-items:center;gap:24px}
.hd b{font-family:Oswald;font-weight:500;font-size:44px;letter-spacing:.08em;display:block}
.hd span{font-family:'IBM Plex Mono';font-size:19px;letter-spacing:.16em;text-transform:uppercase;opacity:.85}
.in{padding:44px 46px}
.gauge{display:flex;align-items:flex-end;gap:26px}
.score{font-family:Oswald;font-weight:700;font-size:${tall ? 260 : 170}px;line-height:.85;color:${accent}}
.max{font-family:'IBM Plex Mono';font-size:26px;color:#6b6a63;padding-bottom:12px}
.bar{margin-top:26px;height:22px;border-radius:11px;background:linear-gradient(90deg,#b3261e,#c9a227 45%,#2e6b55);position:relative}
.bar i{position:absolute;top:-10px;left:calc(${pct * 100}% - 3px);width:6px;height:42px;background:#1b1d21;border-radius:3px}
h1{margin-top:${tall ? 70 : 40}px;font-family:'IBM Plex Serif';font-weight:600;font-size:${fitHeadline(d.headline, tall ? 88 : 56, 28)}px;line-height:1.15}
.body{margin-top:${tall ? 32 : 20}px;font-family:'IBM Plex Serif';font-size:${tall ? 48 : 29}px;line-height:1.48;color:#34363b}
.foot{position:absolute;left:46px;right:46px;bottom:34px;font-family:'IBM Plex Mono';font-size:17px;color:#7a786f;display:flex;justify-content:space-between}
.card{animation:rise .6s var(--e) 0s both}
.bar i{--to:${pct * 100}%;animation:marker 1.4s cubic-bezier(.2,.7,.2,1) .5s both}
h1{animation:rise .6s var(--e) 1.7s both}
.body{animation:rise .6s var(--e) 2s both}
.foot{animation:fade .5s ease 2.2s both}`,
  body: `<div class="card"><div class="hd">${seal(92, '#f4f1ea')}<div><b>CRÉDIT CIVIQUE</b><span>${esc(d.kicker || 'Relevé individuel')}</span></div></div>
<div class="in"><div class="gauge"><div class="score"${Number.isFinite(score) ? ` data-count="${score}" data-delay="0.5" data-dur="1.4"` : ''}>${esc(d.figure || '612')}</div><div class="max">/ 1000</div></div>
<div class="bar"><i></i></div><h1>${esc(d.headline)}</h1>${d.body ? `<div class="body">${para(d.body)}</div>` : ''}</div>
<div class="foot"><span>${esc(d.footer || 'Données certifiées par Aethernet')}</span><span>${esc(d.stamp || '')}</span></div><div class="grain light"></div></div>
${ctaBar(d, '#f4f1ea', '#1b1d21')}` });
}

// ── 6. Carte de fin de vidéo ────────────────────────────────────────────
function endcard(d, { w, h }) {
  return page({ w, h, css: `
body{background:#101215;color:#efe8d8;display:grid;place-items:center;text-align:center}
.w{display:flex;flex-direction:column;align-items:center;gap:40px;padding:0 70px}
h1{font-family:Oswald;font-weight:700;font-size:118px;line-height:.95;text-transform:uppercase}
.sub{font-family:'IBM Plex Serif';font-size:38px;color:#cfc6b2;line-height:1.35}
.link{font-family:'IBM Plex Mono';font-size:40px;padding:22px 40px;border:3px solid #b3261e;color:#efe8d8;letter-spacing:.04em}
.date{font-family:'IBM Plex Mono';font-size:28px;letter-spacing:.2em;text-transform:uppercase;color:#b3261e}
.stage{display:grid;place-items:center}
.w>svg{animation:pop .7s var(--e) 0s both}
h1{animation:rise .6s var(--e) .3s both}
.sub{animation:rise .6s var(--e) .55s both}
.link{animation:pop .5s var(--e) .85s both}
.date{animation:fade .5s ease 1.1s both}`,
  body: `<div class="w">${seal(260, '#b3261e')}<h1>${esc(d.headline || 'Rejoignez l\'État du Sud')}</h1>
<div class="sub">${esc(d.body || '')}</div><div class="link">${esc(d.cta || 'Lien en bio')}</div>
<div class="date">${esc(d.figure || '')}</div></div><div class="grain"></div>` });
}

export const TEMPLATES = { affiche, communique, corpo, countdown, fiche, endcard };

/** *mot* → mot surligné en couleur d'accent dans les titres d'affiche. */
function emph(s = '') {
  return esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** Réduit la taille du titre quand il est long, pour qu'il tienne toujours. */
function fitHeadline(text = '', base, idealChars) {
  const n = String(text).replace(/\*/g, '').length;
  if (n <= idealChars * 2) return base;
  return Math.max(Math.round(base * Math.sqrt((idealChars * 2) / n)), Math.round(base * 0.45));
}
