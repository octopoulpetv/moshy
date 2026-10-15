// Bande-son 100 % procédurale (Web Audio), générée à partir des mêmes événements que l'animation.
// La même fonction sert à la lecture en direct (AudioContext) et à l'export (OfflineAudioContext).
import { soundEvents, T } from '../anim/timeline';
import { DURATION } from '../anim/layout';

type Ctx = BaseAudioContext;
const noiseCache = new WeakMap<Ctx, AudioBuffer>();
function noise(ctx: Ctx) {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff; // bruit pseudo-aléatoire reproductible
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

interface Out { ctx: Ctx; dest: AudioNode; nodes: AudioScheduledSourceNode[] }

function env(o: Out, at: number, attack: number, decay: number, peak: number, hold = 0) {
  const g = o.ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  if (hold) g.gain.setValueAtTime(peak, at + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + decay);
  g.connect(o.dest);
  return g;
}
function osc(o: Out, type: OscillatorType, f: number, at: number, dur: number, to: AudioNode, fEnd?: number) {
  const n = o.ctx.createOscillator();
  n.type = type;
  n.frequency.setValueAtTime(f, at);
  if (fEnd) n.frequency.exponentialRampToValueAtTime(fEnd, at + dur);
  n.connect(to);
  n.start(at);
  n.stop(at + dur + 0.05);
  o.nodes.push(n);
  return n;
}
function burst(o: Out, at: number, dur: number, to: AudioNode, filter: BiquadFilterType, f: number, q = 1, fEnd?: number) {
  const src = o.ctx.createBufferSource();
  src.buffer = noise(o.ctx);
  const bq = o.ctx.createBiquadFilter();
  bq.type = filter;
  bq.frequency.setValueAtTime(f, at);
  if (fEnd) bq.frequency.exponentialRampToValueAtTime(fEnd, at + dur);
  bq.Q.value = q;
  src.connect(bq).connect(to);
  src.start(at, (at * 0.731) % 1.5); // décalage déterministe dans le bruit
  src.stop(at + dur + 0.05);
  o.nodes.push(src);
}

const INSTR: Record<string, (o: Out, at: number, v: number, d: number) => void> = {
  domino(o, at, v) {
    burst(o, at, 0.06, env(o, at, 0.001, 0.06, 1.1 * v), 'bandpass', 2400, 1.1);
    osc(o, 'sine', 230, at, 0.09, env(o, at, 0.001, 0.09, 0.6 * v), 120);
  },
  click(o, at) {
    burst(o, at, 0.03, env(o, at, 0.001, 0.03, 0.6), 'highpass', 3000);
    osc(o, 'sine', 140, at, 0.12, env(o, at, 0.002, 0.12, 0.5), 70);
    burst(o, at + 0.09, 0.03, env(o, at + 0.09, 0.001, 0.03, 0.25), 'highpass', 3500);
  },
  thunk(o, at, v) {
    osc(o, 'sine', 120, at, 0.25, env(o, at, 0.002, 0.25, 0.55 * v), 55);
    burst(o, at, 0.08, env(o, at, 0.001, 0.08, 0.25 * v), 'lowpass', 900);
  },
  whoosh(o, at, _v, d) {
    burst(o, at, d, env(o, at, d * 0.4, d * 0.6, 0.12), 'bandpass', 500, 0.8, 1800);
  },
  tick(o, at) {
    osc(o, 'sine', 1320, at, 0.05, env(o, at, 0.002, 0.05, 0.2));
  },
  change(o, at) {
    // Légère impulsion grave au changement d'heure.
    osc(o, 'sine', 62, at, 0.5, env(o, at, 0.01, 0.5, 0.45), 48);
    osc(o, 'triangle', 880, at, 0.25, env(o, at, 0.005, 0.25, 0.08));
  },
  alarm(o, at) {
    for (let i = 0; i < 4; i++) {
      const t0 = at + i * 0.25;
      const g = env(o, t0, 0.005, 0.1, 0.11, 0.06);
      const lp = o.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3500;
      lp.connect(g);
      osc(o, 'square', 1760, t0, 0.17, lp);
    }
  },
  roll(o, at, _v, d) {
    const g = o.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.3, at + 0.15);
    g.gain.setValueAtTime(0.3, at + d - 0.15);
    g.gain.linearRampToValueAtTime(0, at + d);
    g.connect(o.dest);
    burst(o, at, d, g, 'lowpass', 300, 2, 700);
    // Granulation du roulement.
    const lfo = o.ctx.createOscillator();
    lfo.frequency.value = 23;
    const lg = o.ctx.createGain();
    lg.gain.value = 0.06;
    lfo.connect(lg).connect(g.gain);
    lfo.start(at);
    lfo.stop(at + d);
    o.nodes.push(lfo);
  },
  tock(o, at) {
    osc(o, 'sine', 520, at, 0.12, env(o, at, 0.002, 0.12, 0.3), 380);
    burst(o, at, 0.02, env(o, at, 0.001, 0.02, 0.2), 'highpass', 2500);
  },
  clack(o, at, v) {
    // Tintement métallique : partiels inharmoniques.
    for (const [f, a, dcy] of [[2380, 0.35, 0.35], [3910, 0.2, 0.22], [5470, 0.12, 0.15], [7300, 0.06, 0.1]]) {
      osc(o, 'sine', f, at, dcy, env(o, at, 0.001, dcy, a * v));
    }
    burst(o, at, 0.015, env(o, at, 0.001, 0.015, 0.4 * v), 'highpass', 5000);
  },
  ratchet(o, at) {
    burst(o, at, 0.025, env(o, at, 0.001, 0.025, 0.45), 'bandpass', 4200, 2);
    osc(o, 'sine', 900, at, 0.03, env(o, at, 0.001, 0.03, 0.06));
  },
  servo(o, at, _v, d) {
    const g = env(o, at, 0.04, 0.08, 0.06, Math.max(0, d - 0.12));
    const lp = o.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(g);
    osc(o, 'sawtooth', 160, at, d, lp, 240);
  },
  chime(o, at) {
    [784, 1175, 1568].forEach((f, i) => osc(o, 'sine', f, at + i * 0.09, 1.6, env(o, at + i * 0.09, 0.01, 1.6, 0.09)));
  },
};

/** Automation linéaire par morceaux, reprise correctement depuis n'importe quel instant `from`. */
function automate(p: AudioParam, pts: [number, number][], from: number, startAt: number) {
  const valueAt = (t: number) => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
        return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
      }
    }
    return pts[pts.length - 1][1];
  };
  p.setValueAtTime(valueAt(from), startAt);
  for (const [t, v] of pts) if (t > from) p.linearRampToValueAtTime(v, startAt + (t - from));
}

/** Nappe : drone nocturne qui s'ouvre en accord majeur au lever du soleil. */
function bed(o: Out, from: number, startAt: number) {
  const len = DURATION - from + 0.3;
  const nightG = o.ctx.createGain();
  nightG.connect(o.dest);
  automate(nightG.gain, [[0, 0], [1.5, 0.045], [T.dawn0, 0.045], [T.dawn0 + 4, 0]], from, startAt);
  for (const f of [55, 82.5, 110.2]) {
    const lp = o.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    lp.connect(nightG);
    osc(o, 'sawtooth', f, startAt, len, lp);
  }
  const mG = o.ctx.createGain();
  mG.connect(o.dest);
  automate(mG.gain, [[0, 0], [T.dawn0, 0], [T.dawn0 + 4.5, 0.05], [DURATION - 1.2, 0.05], [DURATION, 0]], from, startAt);
  [110, 138.6, 164.8, 220, 277.2].forEach((f, i) => {
    const n = osc(o, 'triangle', f, startAt, len, mG);
    n.detune.value = (i % 2 ? 1 : -1) * 6;
  });
}

/**
 * Programme toute la bande-son à partir de l'instant `from` du film, joué à `startAt` (horloge du contexte).
 * Renvoie les sources créées (pour pouvoir les arrêter à la pause ou au déplacement dans la timeline).
 */
export function scheduleScore(ctx: Ctx, dest: AudioNode, from: number, startAt: number): AudioScheduledSourceNode[] {
  const o: Out = { ctx, dest, nodes: [] };
  bed(o, from, startAt);
  for (const e of soundEvents()) {
    const d = e.d ?? 0;
    if (e.t + d < from) continue;
    if (e.t < from) continue; // les sons longs déjà commencés ne reprennent pas en cours
    INSTR[e.type]?.(o, startAt + (e.t - from), e.v ?? 1, d);
  }
  return o.nodes;
}

/** Rendu hors-ligne de la bande-son complète (export). */
export async function renderScore(sampleRate = 48000): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * DURATION), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  scheduleScore(ctx, master, 0, 0);
  return ctx.startRendering();
}

export function wavFromBuffer(buf: AudioBuffer): ArrayBuffer {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const out = new ArrayBuffer(44 + len * ch * 2);
  const v = new DataView(out);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, 'data');
  v.setUint32(40, len * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let p = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, data[c][i]));
    v.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    p += 2;
  }
  return out;
}
