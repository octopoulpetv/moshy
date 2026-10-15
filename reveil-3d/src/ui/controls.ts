// Interface discrète et masquable : lecture/pause, recommencer, timeline, son, plein écran, export.
import { DURATION, FPS } from '../anim/layout';

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5v2H6v3zm10-5h6v5h-2V6h-4zM6 15v3h3v2H4v-5zm12 3v-3h2v5h-5v-2z"/></svg>',
  hide: '<svg viewBox="0 0 24 24"><path d="M12 6c4.4 0 8 3.6 9.5 6-1 1.6-2.5 3.2-4.4 4.3l1.5 1.5-1.4 1.4L4.8 6.8l1.4-1.4 2 2A10 10 0 0 1 12 6zm-9.5 6c.8-1.3 2-2.7 3.4-3.7l2.2 2.2a4 4 0 0 0 5.4 5.4l1.6 1.6A9.7 9.7 0 0 1 12 18c-4.4 0-8-3.6-9.5-6z"/></svg>',
  export: '<svg viewBox="0 0 24 24"><path d="M11 3h2v9.2l3.3-3.3 1.4 1.4-5.7 5.7-5.7-5.7 1.4-1.4 3.3 3.3zM5 18h14v2H5z"/></svg>',
};

export interface ControlsApi {
  isPlaying(): boolean;
  togglePlay(): void;
  restart(): void;
  seek(t: number): void;
  toggleMute(): boolean;
  exportWebm(): void;
}

export function buildControls(root: HTMLElement, api: ControlsApi) {
  root.innerHTML = `
    <div class="bar" role="toolbar" aria-label="Lecture du film">
      <button data-a="play" aria-label="Lecture / pause (Espace)">${ICON.play}</button>
      <button data-a="restart" aria-label="Recommencer (R)">${ICON.restart}</button>
      <span class="time">00:00.0 / 00:24.0</span>
      <input type="range" min="0" max="${DURATION}" step="${1 / FPS}" value="0" aria-label="Position dans le film">
      <button data-a="mute" aria-label="Son (M)">${ICON.sound}</button>
      <button data-a="full" aria-label="Plein écran (F)">${ICON.full}</button>
      <button data-a="export" aria-label="Exporter la vidéo" class="wide">${ICON.export}&nbsp;Exporter</button>
      <button data-a="hide" aria-label="Masquer les commandes (H)">${ICON.hide}</button>
    </div>
    <div class="hint">H : afficher les commandes</div>`;
  const bar = root.querySelector('.bar') as HTMLElement;
  const range = root.querySelector('input') as HTMLInputElement;
  const time = root.querySelector('.time') as HTMLElement;
  const playBtn = root.querySelector('[data-a=play]') as HTMLButtonElement;
  const muteBtn = root.querySelector('[data-a=mute]') as HTMLButtonElement;
  let dragging = false;

  const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const toggleHidden = () => document.body.classList.toggle('hidden-ui');
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  bar.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('button')?.dataset.a;
    if (a === 'play') api.togglePlay();
    if (a === 'restart') api.restart();
    if (a === 'mute') muteBtn.innerHTML = api.toggleMute() ? ICON.mute : ICON.sound;
    if (a === 'full') void fullscreen();
    if (a === 'hide') toggleHidden();
    if (a === 'export') api.exportWebm();
  });
  range.addEventListener('input', () => { dragging = true; api.seek(Number(range.value)); });
  range.addEventListener('change', () => { dragging = false; });

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' && e.key !== ' ') return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); api.togglePlay(); }
    else if (k === 'r') api.restart();
    else if (k === 'h') toggleHidden();
    else if (k === 'f') void fullscreen();
    else if (k === 'm') muteBtn.innerHTML = api.toggleMute() ? ICON.mute : ICON.sound;
    else if (k === 'arrowright') api.seek(Number(range.value) + (e.shiftKey ? 1 : 1 / FPS));
    else if (k === 'arrowleft') api.seek(Number(range.value) - (e.shiftKey ? 1 : 1 / FPS));
  });

  // Masquage automatique pendant la lecture quand la souris ne bouge plus.
  let idleTimer = 0;
  const wake = () => {
    bar.classList.remove('idle');
    document.body.style.cursor = '';
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (api.isPlaying() && !bar.matches(':hover')) { bar.classList.add('idle'); document.body.style.cursor = 'none'; }
    }, 2200);
  };
  window.addEventListener('pointermove', wake);
  window.addEventListener('keydown', wake);
  wake();

  return {
    update(t: number, playing: boolean) {
      time.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
      if (!dragging) range.value = String(t);
      const icon = playing ? ICON.pause : ICON.play;
      if (playBtn.dataset.state !== String(playing)) { playBtn.innerHTML = icon; playBtn.dataset.state = String(playing); }
      if (!playing) bar.classList.remove('idle');
    },
  };
}

/** Fenêtre de progression de l'export. */
export function exportDialog(onStart: (ctl: { progress: (k: number, label: string) => void; signal: AbortSignal }) => Promise<void>) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="exp-t">
    <h2 id="exp-t">Exporter le film</h2>
    <p>Vidéo WebM 1920 × 1080, 30 images/s, ${DURATION} s, son Opus. Le rendu est calculé image par image :
    la durée reste exacte même si l'ordinateur est lent. Gardez cet onglet au premier plan.</p>
    <div class="progress"><i></i></div><div class="status">Prêt.</div>
    <div class="row"><button data-a="close">Annuler</button><button data-a="go" class="primary">Lancer l'export</button></div></div>`;
  document.body.append(ov);
  const bar = ov.querySelector('.progress i') as HTMLElement;
  const status = ov.querySelector('.status') as HTMLElement;
  const go = ov.querySelector('[data-a=go]') as HTMLButtonElement;
  const abort = new AbortController();
  ov.querySelector('[data-a=close]')!.addEventListener('click', () => { abort.abort(); ov.remove(); });
  go.addEventListener('click', async () => {
    if (go.dataset.done) { ov.remove(); return; }
    go.disabled = true;
    try {
      await onStart({
        signal: abort.signal,
        progress: (k, label) => { bar.style.width = `${Math.round(k * 100)}%`; status.textContent = `${label} — ${Math.round(k * 100)} %`; },
      });
      status.textContent = 'Terminé : le fichier a été téléchargé.';
      go.textContent = 'Fermer';
      go.dataset.done = '1';
      go.disabled = false;
    } catch (e) {
      status.innerHTML = `<span class="error">${(e as Error).message}</span>`;
      go.disabled = false;
    }
  });
}
