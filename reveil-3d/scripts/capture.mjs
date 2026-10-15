// Captures de contrôle à des instants clés : node scripts/capture.mjs [dossier] [t1 t2 ...]
import { mkdirSync } from 'node:fs';
import { serveDist, openFilm } from './browser.mjs';

const out = process.argv[2] || 'captures';
const times = process.argv.slice(3).map(Number);
const list = times.length ? times : [0.3, 1.4, 2.6, 3.6, 4.6, 5.6, 6.6, 7.6, 8.8, 9.5, 10.6, 12.2, 13.6, 15.4, 16.4, 18.5, 20.5, 22.0, 23.9];
mkdirSync(out, { recursive: true });
const srv = await serveDist();
const film = await openFilm(srv.url);
const t0 = Date.now();
for (const t of list) {
  await film.frame(t, `${out}/t${t.toFixed(2).padStart(5, '0')}.png`);
  process.stdout.write(`t=${t} `);
}
console.log(`\n${list.length} captures en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(film.errors.length ? film.errors.join('\n') : 'Console : aucune erreur.');
await film.browser.close();
srv.close();
