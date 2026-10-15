import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT } from '../config.js';

const run = promisify(execFile);
const FPS = 30;

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
 * Assemble un Short 9:16 : chaque scène = image fixe avec lent zoom avant + fondu.
 * scenes = [{ image, seconds }]; voice = fichier audio facultatif.
 */
export async function buildShort({ scenes, voice, outFile, workDir }) {
  fs.mkdirSync(workDir, { recursive: true });

  // Si une voix off existe, on étire les scènes pour couvrir sa durée (+0,8 s de marge).
  let durations = scenes.map((s) => Math.max(1.5, Number(s.seconds) || 3));
  if (voice) {
    const voiceLen = await mediaDuration(voice);
    const total = durations.reduce((a, b) => a + b, 0);
    const lastFixed = durations[durations.length - 1]; // la carte de fin garde sa durée
    const scale = Math.max(1, (voiceLen + 0.8 - lastFixed) / (total - lastFixed));
    durations = durations.map((d, i) => (i === durations.length - 1 ? d : d * scale));
  }

  const clips = [];
  for (const [i, s] of scenes.entries()) {
    const d = durations[i];
    const frames = Math.round(d * FPS);
    const clip = path.join(workDir, `clip-${i}.mp4`);
    // Zoom avant de 0 à 6 % sur la durée de la scène, fondu d'entrée et de sortie.
    const vf = [
      'scale=2160:3840',
      `zoompan=z='1+0.06*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`,
      `fade=t=in:st=0:d=0.25,fade=t=out:st=${(d - 0.25).toFixed(2)}:d=0.25`,
      'format=yuv420p',
    ].join(',');
    await ffmpeg(['-loop', '1', '-i', s.image, '-t', d.toFixed(2), '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', clip]);
    clips.push(clip);
  }

  const list = path.join(workDir, 'list.txt');
  fs.writeFileSync(list, clips.map((c) => `file '${c}'`).join('\n'));
  const silent = path.join(workDir, 'silent.mp4');
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

  const total = durations.reduce((a, b) => a + b, 0);
  const music = pickMusic();
  const inputs = ['-i', silent];
  const filters = [];
  let n = 1;
  const mix = [];
  if (voice) { inputs.push('-i', voice); filters.push(`[${n}:a]aresample=48000,volume=1.0[v]`); mix.push('[v]'); n++; }
  if (music) {
    inputs.push('-stream_loop', '-1', '-i', music);
    filters.push(`[${n}:a]aresample=48000,volume=${voice ? 0.18 : 0.6},afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2[m]`);
    mix.push('[m]'); n++;
  }

  if (!mix.length) {
    // Piste audio silencieuse : certaines plateformes rejettent les vidéos sans audio.
    await ffmpeg(['-i', silent, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart', outFile]);
  } else {
    const graph = [...filters, `${mix.join('')}amix=inputs=${mix.length}:duration=longest:normalize=0[a]`].join(';');
    await ffmpeg([...inputs, '-filter_complex', graph, '-map', '0:v', '-map', '[a]', '-t', total.toFixed(2),
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile]);
  }
  fs.rmSync(workDir, { recursive: true, force: true });
  return { file: outFile, seconds: Math.round(total * 10) / 10 };
}
