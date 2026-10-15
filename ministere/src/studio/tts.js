import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { config, VOICES_DIR } from '../config.js';

const run = promisify(execFile);

/** Génère la voix off. Renvoie le chemin du fichier audio, ou null si aucun fournisseur. */
export async function synthesize(text, outBase) {
  if (!text?.trim()) return null;
  const { provider } = config.tts;

  if (provider === 'elevenlabs') {
    if (!config.tts.elevenKey || !config.tts.elevenVoice) throw new Error('ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID manquants');
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.tts.elevenVoice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': config.tts.elevenKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.7, similarity_boost: 0.8, style: 0.15 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status} : ${await res.text()}`);
    const out = `${outBase}.mp3`;
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    return out;
  }

  if (provider === 'piper') {
    const out = `${outBase}.wav`;
    await new Promise((resolve, reject) => {
      const child = execFile(config.tts.piperBin, ['--model', config.tts.piperModel, '--output_file', out], (err) => (err ? reject(err) : resolve()));
      child.stdin.end(text);
    });
    return out;
  }

  return null;
}


/** Fichier de voix enregistré pour un post (data/voices/post-12.webm…), ou null. */
export function recordedVoice(postId) {
  const f = fs.readdirSync(VOICES_DIR).find((n) => n.startsWith(`post-${postId}.`));
  return f ? path.join(VOICES_DIR, f) : null;
}

/**
 * Prépare ta prise de voix : coupe le silence du début et de la fin, retire les basses
 * parasites, compresse légèrement et normalise le volume (-16 LUFS, standard des réseaux).
 */
export async function prepareVoice(input, outBase) {
  const out = `${outBase}.wav`;
  const af = [
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1',
    'areverse', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3', 'areverse',
    'highpass=f=70',
    'acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
  ].join(',');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-af', af, '-ar', '48000', '-ac', '1', out]);
  return out;
}
