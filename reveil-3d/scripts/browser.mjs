// Outils communs aux scripts : serveur statique du build + Chromium sans interface avec WebGL.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

export async function serveDist() {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('Pas de build : lancez « npm run build » d\'abord.');
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = join(DIST, url === '/' ? 'index.html' : url);
    try {
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

function chromiumPath() {
  const list = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
  const p = list.find((x) => existsSync(x));
  if (!p) throw new Error('Chromium/Chrome introuvable : définissez CHROMIUM_PATH.');
  return p;
}

export async function openFilm(url) {
  const browser = await chromium.launch({
    executablePath: chromiumPath(),
    args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=default', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(url + '?capture=1');
  await page.waitForFunction(() => window.__film?.ready, null, { timeout: 120000 });
  const canvas = page.locator('#film');
  return {
    browser, page, errors,
    async frame(t, path, w = 1920, h = 1080) {
      await page.evaluate(([t, w, h]) => window.__film.renderFrame(t, w, h), [t, w, h]);
      return canvas.screenshot({ path, type: "png" });
    },
  };
}
