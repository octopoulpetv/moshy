// Outils numériques purs (aucune dépendance à Three.js) : courbes, interpolations, ressorts.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const deg = (d: number) => (d * Math.PI) / 180;

export const smoothstep = (a: number, b: number, x: number) => {
  const k = invLerp(a, b, x);
  return k * k * (3 - 2 * k);
};
export const smootherstep = (a: number, b: number, x: number) => {
  const k = invLerp(a, b, x);
  return k * k * k * (k * (k * 6 - 15) + 10);
};
export const easeInQuad = (k: number) => k * k;
export const easeOutQuad = (k: number) => 1 - (1 - k) * (1 - k);
export const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
export const easeInCubic = (k: number) => k * k * k;
export const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeInOutSine = (k: number) => -(Math.cos(Math.PI * k) - 1) / 2;

/** Réponse amortie d'un ressort à un échelon (0 → 1), dépassement léger. */
export function springStep(t: number, freq = 9, damping = 0.45): number {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const z = damping;
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t));
}

/** Impulsion amortie : 0 → pic → 0 (enfoncement d'un bouton puis retour). */
export function dampedPulse(t: number, attack = 0.05, freq = 7, damping = 0.5): number {
  if (t <= 0) return 0;
  if (t < attack) return easeOutQuad(t / attack);
  const u = t - attack;
  const w = 2 * Math.PI * freq;
  return Math.exp(-damping * w * u * 0.5) * Math.cos(w * u * 0.5 * Math.sqrt(1 - damping * damping));
}

/** Flash lumineux : monte vite, décroît exponentiellement. */
export const flash = (t: number, decay = 5) => (t < 0 ? 0 : t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) * decay));

export type V3 = [number, number, number];
export const v3lerp = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/**
 * Trajectoire parabolique d'un point P0 à P1 sur une durée donnée, avec un sommet imposé.
 * Renvoie la position à l'instant tau (0..T). Gravité implicite, horizontal uniforme.
 */
export function parabola(p0: V3, p1: V3, apexY: number, T: number, tau: number): V3 {
  const u = clamp(tau / T);
  const d = p1[1] - p0[1];
  const h = Math.max(apexY - p0[1], d + 1e-3, 1e-3);
  const B = 2 * h + Math.sqrt(Math.max(0, 4 * h * h - 4 * d * h));
  const C = B - d;
  return [lerp(p0[0], p1[0], u), p0[1] + B * u - C * u * u, lerp(p0[2], p1[2], u)];
}

/** Images clés scalaires interpolées par Hermite (tangentes Catmull-Rom pondérées par le temps). */
export interface Key<T> { t: number; v: T }

function hermite(p0: number, p1: number, m0: number, m1: number, u: number, dt: number) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 * dt + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1 * dt;
}

/** Courbe lisse (C1) passant par des valeurs vectorielles datées. */
export function sampleKeys(keys: Key<number[]>[], t: number): number[] {
  if (t <= keys[0].t) return keys[0].v.slice();
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v.slice();
  let i = 0;
  while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1];
  const prev = keys[i - 1], next = keys[i + 2];
  const dt = b.t - a.t;
  const u = (t - a.t) / dt;
  return a.v.map((_, c) => {
    // Tangentes nulles aux extrémités (départ et arrivée en douceur).
    const m0 = prev ? (b.v[c] - prev.v[c]) / (b.t - prev.t) : 0;
    const m1 = next ? (next.v[c] - a.v[c]) / (next.t - a.t) : 0;
    return hermite(a.v[c], b.v[c], m0, m1, u, dt);
  });
}
