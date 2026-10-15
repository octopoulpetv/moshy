import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';

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

