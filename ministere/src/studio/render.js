import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { config, DATA_DIR } from '../config.js';
import { TEMPLATES } from './templates.js';

export const SIZES = {
  portrait: { w: 1080, h: 1350 }, // 4:5 — fil Instagram / X / Facebook
  story: { w: 1080, h: 1920 },    // 9:16 — Shorts, Reels, TikTok, stories
};

const TMP = path.join(DATA_DIR, 'tmp');
fs.mkdirSync(TMP, { recursive: true });

function chromiumPath() {
  const candidates = [config.chromiumPath, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
    .filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chromium introuvable : installe-le (apt install chromium) et renseigne CHROMIUM_PATH');
  return found;
}

let browserPromise;
async function browser() {
  browserPromise ??= chromium.launch({ executablePath: chromiumPath(), args: ['--no-sandbox', '--font-render-hinting=none'] });
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) (await browserPromise).close();
  browserPromise = undefined;
}

/** Rend un gabarit en PNG. `data` = champs du visuel (headline, body, ...). */
export async function renderPNG(template, data, sizeName, outFile) {
  const tpl = TEMPLATES[template];
  if (!tpl) throw new Error(`Gabarit inconnu : ${template}`);
  const size = SIZES[sizeName];
  const html = tpl(data, size);
  const htmlFile = path.join(TMP, `${path.basename(outFile, '.png')}.html`);
  fs.writeFileSync(htmlFile, html);

  const b = await browser();
  const page = await b.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  try {
    await page.goto('file://' + htmlFile, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.__static());
    await page.screenshot({ path: outFile, type: 'png' });
  } finally {
    await page.close();
    fs.rmSync(htmlFile, { force: true });
  }
  return outFile;
}

/**
 * Rend un gabarit ANIMÉ en clip vidéo : Chromium avance le temps image par image
 * (window.__seek), chaque image part directement dans ffmpeg. Rendu déterministe,
 * aucune image sautée, quelle que soit la puissance du VPS.
 */
export async function renderClip(template, data, sizeName, seconds, outFile, { fps = 30 } = {}) {
  const tpl = TEMPLATES[template];
  if (!tpl) throw new Error(`Gabarit inconnu : ${template}`);
  const size = SIZES[sizeName];
  const htmlFile = path.join(TMP, `${path.basename(outFile, '.mp4')}-${process.pid}.html`);
  fs.writeFileSync(htmlFile, tpl(data, size));

  const frames = Math.round(seconds * fps);
  const fadeOut = Math.max(0, seconds - 0.2).toFixed(2);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `fade=t=in:st=0:d=0.18,fade=t=out:st=${fadeOut}:d=0.2,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-r', String(fps), outFile]);
  let stderr = '';
  ff.stderr.on('data', (d) => { stderr += d; });
  const done = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg : ${stderr}`)))));

  const b = await browser();
  const page = await b.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  try {
    await page.goto('file://' + htmlFile, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => window.__seek(t), i / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
  } finally {
    ff.stdin.end();
    await page.close();
    fs.rmSync(htmlFile, { force: true });
  }
  await done;
  return outFile;
}
