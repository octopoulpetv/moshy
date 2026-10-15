// Point d'entrée : lecture temps réel, interface, et API de rendu image par image pour l'export.
import './style.css';
import { Film } from './film';
import { DURATION, FPS } from './anim/layout';
import { AudioPlayer } from './audio/player';
import { renderScore, wavFromBuffer } from './audio/score';
import { buildControls, exportDialog } from './ui/controls';
import { exportWebM, webmSupported } from './export/webm';

const params = new URLSearchParams(location.search);
const capture = params.has('capture'); // mode piloté par script (export MP4, captures)
if (capture) document.body.classList.add('capture');

const canvas = document.getElementById('film') as HTMLCanvasElement;
const film = new Film(canvas);
const audio = new AudioPlayer();

let t = Number(params.get('t') ?? 0);
let playing = false;
let exporting = false;
// Horloge de lecture : t = t0 + (maintenant - départ). Si le rendu est lent, des images sont sautées
// mais l'image reste synchronisée avec le son.
let clockT0 = 0;
let clockStart = 0;
const startClock = () => { clockT0 = t; clockStart = performance.now(); };

/** Adapte le canevas à la fenêtre en 16:9 (bandes noires si nécessaire). */
function fit() {
  if (capture || exporting) return;
  const W = window.innerWidth, H = window.innerHeight;
  const w = Math.min(W, (H * 16) / 9), h = (w * 9) / 16;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  film.setSize(Math.round(w), Math.round(h), Math.min(window.devicePixelRatio || 1, 1.5));
  film.renderAt(t);
}

const api = {
  isPlaying: () => playing,
  togglePlay() {
    if (t >= DURATION - 1e-3) t = 0;
    playing = !playing;
    startClock();
    if (playing) audio.play(t); else audio.stop();
  },
  restart() { t = 0; startClock(); if (playing) audio.play(0); film.renderAt(0); },
  seek(v: number) {
    t = Math.min(DURATION, Math.max(0, v));
    startClock();
    film.renderAt(t);
    if (playing) audio.play(t);
  },
  toggleMute() {
    audio.muted = !audio.muted;
    if (audio.muted) audio.stop(); else if (playing) audio.play(t);
    return audio.muted;
  },
  exportWebm() {
    if (!webmSupported()) {
      alert('Ce navigateur ne prend pas en charge WebCodecs. Utilisez Chrome/Edge récent, ou « npm run export:mp4 » (voir README).');
      return;
    }
    const wasPlaying = playing;
    if (playing) api.togglePlay();
    exportDialog(async ({ progress, signal }) => {
      exporting = true;
      try {
        const blob = await exportWebM(film, { onProgress: progress, signal });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'reveil-machine-1080p.webm';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      } finally {
        exporting = false;
        startClock();
        fit();
        if (wasPlaying) api.togglePlay();
      }
    });
  },
};

const ui = capture ? null : buildControls(document.getElementById('ui')!, api);

function frame(now: number) {
  if (!capture && !exporting) {
    if (playing) {
      t = clockT0 + (now - clockStart) / 1000;
      if (t >= DURATION) { t = DURATION; playing = false; audio.stop(); }
      film.renderAt(t);
    }
    ui?.update(t, playing);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', fit);
if (capture) {
  film.setSize(1920, 1080, 1);
  film.renderAt(t);
} else {
  fit();
  requestAnimationFrame(frame);
}

// API pour les scripts (export MP4 image par image, captures de vérification).
declare global {
  interface Window { __film: Record<string, unknown> }
}
window.__film = {
  ready: true,
  duration: DURATION,
  fps: FPS,
  renderFrame(time: number, w = 1920, h = 1080) {
    film.setSize(w, h, 1);
    film.renderAt(time);
    return true;
  },
  /** Export WebM complet dans la page (renvoie les octets en base64) — utilisé par les tests. */
  async webmBase64(duration = DURATION, w = 1920, h = 1080) {
    const blob = await exportWebM(film, { duration, width: w, height: h });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  },
  async audioWavBase64() {
    const buf = await renderScore(48000);
    const bytes = new Uint8Array(wavFromBuffer(buf));
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  },
};
