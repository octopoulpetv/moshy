// Export MP4 H.264 déterministe : chaque image est calculée à t = i / 30 dans Chromium, puis encodée par FFmpeg.
// Usage :
//   npm run build && npm run export:mp4                          → reveil-machine-1080p.mp4
//   node scripts/export-mp4.mjs --out film.mp4 --from 0 --to 24
//   node scripts/export-mp4.mjs --png frames/                    → séquence PNG + bande-son WAV + commande FFmpeg
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveDist, openFilm } from './browser.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const out = args.out || 'reveil-machine-1080p.mp4';
const W = Number(args.width || 1920), H = Number(args.height || 1080);

try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch {
  console.error('FFmpeg est requis (https://ffmpeg.org) et doit être dans le PATH.');
  process.exit(1);
}

const srv = await serveDist();
const film = await openFilm(srv.url);
const { duration, fps } = await film.page.evaluate(() => ({ duration: window.__film.duration, fps: window.__film.fps }));
const from = Number(args.from ?? 0), to = Math.min(duration, Number(args.to ?? duration));
const i0 = Math.round(from * fps), i1 = Math.round(to * fps);

console.log('Bande-son…');
const wavB64 = await film.page.evaluate(() => window.__film.audioWavBase64());
const wavPath = args.png ? join(args.png, 'bande-son.wav') : `${out}.wav`;
if (args.png) mkdirSync(args.png, { recursive: true });
writeFileSync(wavPath, Buffer.from(wavB64, 'base64'));

let ff = null, ffDone = null;
if (!args.png) {
  ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-ss', String(from), '-i', wavPath,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-r', String(fps), '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg a échoué (${c})`)))));
}

const t0 = Date.now();
for (let i = i0; i < i1; i++) {
  const png = await film.frame(i / fps, args.png ? join(args.png, `frame_${String(i).padStart(5, '0')}.png`) : undefined, W, H);
  if (ff && !ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  const done = i - i0 + 1, total = i1 - i0;
  if (done % 10 === 0 || done === total) {
    const eta = ((Date.now() - t0) / done) * (total - done) / 1000;
    process.stdout.write(`\rImage ${done}/${total} — reste ≈ ${Math.ceil(eta / 60)} min   `);
  }
}
console.log();
if (ff) {
  ff.stdin.end();
  await ffDone;
  console.log(`Vidéo écrite : ${out}`);
} else {
  console.log(`Séquence écrite dans ${args.png}. Encodage MP4 :`);
  console.log(`ffmpeg -framerate ${fps} -start_number ${i0} -i "${args.png}/frame_%05d.png" -i "${wavPath}" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart ${out}`);
}
const errs = film.errors.filter((e) => !e.includes('GL Driver'));
if (errs.length) console.log('Console :\n' + errs.join('\n'));
await film.browser.close();
srv.close();
