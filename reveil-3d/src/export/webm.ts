// Export vidéo WebM dans le navigateur : rendu image par image (déterministe, 30 i/s exactes),
// encodage VP9 via WebCodecs, bande-son Opus rendue hors-ligne, multiplexage webm-muxer.
// La durée et la fluidité ne dépendent pas de la vitesse de la machine.
import { Muxer, ArrayBufferTarget } from 'webm-muxer';
import type { Film } from '../film';
import { DURATION, FPS } from '../anim/layout';
import { renderScore } from '../audio/score';

export const webmSupported = () => typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';

async function pickCodec(w: number, h: number) {
  for (const [codec, mux] of [['vp09.00.40.08', 'V_VP9'], ['vp8', 'V_VP8']] as const) {
    const cfg: VideoEncoderConfig = { codec, width: w, height: h, bitrate: 18_000_000, framerate: FPS };
    if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, mux };
  }
  throw new Error('Aucun encodeur VP9/VP8 disponible dans ce navigateur');
}

export async function exportWebM(film: Film, opts: {
  width?: number; height?: number; withAudio?: boolean; duration?: number;
  onProgress?: (k: number, label: string) => void; signal?: AbortSignal;
} = {}): Promise<Blob> {
  const { width = 1920, height = 1080, withAudio = true, duration = DURATION, onProgress = () => {}, signal } = opts;
  const { cfg, mux } = await pickCodec(width, height);
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: mux, width, height, frameRate: FPS },
    audio: withAudio ? { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 2 } : undefined,
    firstTimestampBehavior: 'offset',
  });

  let error: Error | null = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { error = e; } });
  venc.configure(cfg);

  film.setSize(width, height, 1);
  const frames = Math.round(duration * FPS);
  const canvas = film.renderer.domElement;
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) throw new Error('Export annulé');
    if (error) throw error;
    film.renderAt(i / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 1));
    if (i % 3 === 0) {
      onProgress(i / frames * (withAudio ? 0.92 : 1), `Image ${i + 1} / ${frames}`);
      await new Promise((r) => setTimeout(r, 0)); // laisse respirer l'interface
    }
  }
  await venc.flush();
  venc.close();

  if (withAudio) {
    onProgress(0.93, 'Bande-son');
    const buf = await renderScore(48000);
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { error = e; } });
    aenc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 192_000 });
    const block = 960;
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const total = Math.min(buf.length, Math.round(duration * 48000));
    for (let p = 0; p < total; p += block) {
      const n = Math.min(block, total - p);
      const data = new Float32Array(n * 2);
      data.set(L.subarray(p, p + n), 0);
      data.set(R.subarray(p, p + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((p * 1e6) / 48000), data });
      aenc.encode(ad);
      ad.close();
    }
    await aenc.flush();
    aenc.close();
  }
  if (error) throw error;
  muxer.finalize();
  onProgress(1, 'Terminé');
  return new Blob([muxer.target.buffer], { type: 'video/webm' });
}
