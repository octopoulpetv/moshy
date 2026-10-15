import fs from 'node:fs';
import path from 'node:path';
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
    await page.screenshot({ path: outFile, type: 'png' });
  } finally {
    await page.close();
    fs.rmSync(htmlFile, { force: true });
  }
  return outFile;
}
