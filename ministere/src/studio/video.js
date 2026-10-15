import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT } from '../config.js';
import { renderClip } from './render.js';

const run = promisify(execFile);

async function ffmpeg(args) {
  try {
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 26 });
  } catch (e) {
    throw new Error(`ffmpeg a échoué : ${e.stderr || e.message}`);
  }
}

export async function mediaDuration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(stdout.trim());
}

function pickMusic() {
  const dir = path.join(ROOT, 'assets', 'music');
  const tracks = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f)) : [];
  return tracks.length ? path.join(dir, tracks[Math.floor(Math.random() * tracks.length)]) : null;
}

/**
 * Durées des scènes. Avec une voix off, les scènes s'allongent pour la couvrir
 * (la carte de fin garde sa durée et la voix peut se terminer dessus).
 */
export function planDurations(seconds, voiceLen) {
  let d = seconds.map((s) => Math.max(2, Number(s) || 3.5));
  if (voiceLen) {
    const last = d[d.length - 1];
    const body = d.slice(0, -1).reduce((a, b) => a + b, 0);
    const scale = Math.max(1, (voiceLen + 0.8 - last) / body);
    d = d.map((x, i) => (i === d.length - 1 ? x : x * scale));
  }
  return d.map((x) => Math.round(x * 30) / 30);
}

/**
 * Nappe sonore générée (libre de droits) : drone grave, souffle, tic-tac d'horloge
 * administrative et un impact sourd à chaque changement de scène.
 */
async function ambience(total, cuts, out) {
  const T = total.toFixed(2);
  const inputs = [
    '-f', 'lavfi', '-i', `sine=f=55:d=${T}:r=48000`,
    '-f', 'lavfi', '-i', `sine=f=82.41:d=${T}:r=48000`,
    '-f', 'lavfi', '-i', `anoisesrc=c=brown:a=0.25:d=${T}:r=48000`,
    '-f', 'lavfi', '-i', `aevalsrc='0.55*sin(2*PI*1500*t)*exp(-95*mod(t\\,1))':d=${T}:s=48000`,
  ];
  const parts = [
    '[0]volume=0.30,tremolo=f=0.13:d=0.5[a]',
    '[1]volume=0.14,tremolo=f=0.11:d=0.6[b]',
    '[2]lowpass=f=260,volume=0.5[c]',
    '[3]highpass=f=900,volume=0.16[d]',
  ];
  const mix = ['[a]', '[b]', '[c]', '[d]'];
  cuts.forEach((t, i) => {
    inputs.push('-f', 'lavfi', '-i', `aevalsrc='0.9*sin(2*PI*48*t)*exp(-5*t)+0.25*sin(2*PI*96*t)*exp(-9*t)':d=1.4:s=48000`);
    parts.push(`[${4 + i}]adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)},volume=0.8[h${i}]`);
    mix.push(`[h${i}]`);
  });
  const graph = [...parts,
    `${mix.join('')}amix=inputs=${mix.length}:duration=first:normalize=0,afade=t=in:d=1.2,afade=t=out:st=${Math.max(0, total - 1.5).toFixed(2)}:d=1.5,alimiter=limit=0.8[o]`,
  ].join(';');
  await ffmpeg([...inputs, '-filter_complex', graph, '-map', '[o]', '-ac', '2', '-t', T, out]);
  return out;
}

/**
 * Assemble un Short 9:16 animé.
 * scenes = [{ template, data, seconds }] ; voice = fichier audio facultatif.
 */
export async function buildShort({ scenes, voice, outFile, workDir }) {
  fs.mkdirSync(workDir, { recursive: true });
  const voiceLen = voice ? await mediaDuration(voice) : 0;
  const durations = planDurations(scenes.map((s) => s.seconds), voiceLen);
  const total = durations.reduce((a, b) => a + b, 0);

  const clips = [];
  for (const [i, s] of scenes.entries()) {
    clips.push(await renderClip(s.template, s.data, 'story', durations[i], path.join(workDir, `clip-${i}.mp4`)));
  }
  const list = path.join(workDir, 'list.txt');
  fs.writeFileSync(list, clips.map((c) => `file '${c}'`).join('\n'));
  const silent = path.join(workDir, 'silent.mp4');
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

  // Bande son : musique fournie, sinon nappe générée ; voix par-dessus.
  const cuts = durations.slice(0, -1).reduce((acc, d) => [...acc, (acc.at(-1) ?? 0) + d], []);
  const music = pickMusic() || await ambience(total, cuts, path.join(workDir, 'ambiance.wav'));
  const inputs = ['-i', silent, '-stream_loop', '-1', '-i', music];
  const filters = [`[1:a]aresample=48000,volume=${voice ? 0.35 : 0.9},afade=t=out:st=${Math.max(0, total - 1.2).toFixed(2)}:d=1.2[m]`];
  const mix = ['[m]'];
  if (voice) {
    inputs.push('-i', voice);
    filters.push('[2:a]aresample=48000,adelay=350|350[v]');
    mix.push('[v]');
  }
  const graph = [...filters, `${mix.join('')}amix=inputs=${mix.length}:duration=longest:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=11[a]`].join(';');
  await ffmpeg([...inputs, '-filter_complex', graph, '-map', '0:v', '-map', '[a]', '-t', total.toFixed(2),
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile]);

  fs.rmSync(workDir, { recursive: true, force: true });
  return { file: outFile, seconds: Math.round(total * 10) / 10 };
}
