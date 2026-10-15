import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';

const LORE_DIR = path.join(ROOT, 'lore');

/** Concatène tous les .md de lore/ (ordre alphabétique) : la bible complète. */
export function loadLore() {
  return fs.readdirSync(LORE_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => `<!-- ${f} -->\n` + fs.readFileSync(path.join(LORE_DIR, f), 'utf8').trim())
    .join('\n\n');
}
