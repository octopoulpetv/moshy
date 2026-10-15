// Chemin lisse (Catmull-Rom centripète) échantillonné en abscisse curviligne : pour les billes et les rails.
import type { V3 } from './math';

export class Path {
  readonly pts: V3[] = [];
  readonly cum: number[] = [];
  readonly length: number;

  constructor(ctrl: V3[], samples = 240) {
    const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
    for (let i = 0; i < samples; i++) {
      const u = (i / (samples - 1)) * (ctrl.length - 1);
      const seg = Math.min(Math.floor(u), ctrl.length - 2);
      this.pts.push(catmull(P[seg], P[seg + 1], P[seg + 2], P[seg + 3], u - seg));
    }
    let L = 0;
    this.cum.push(0);
    for (let i = 1; i < this.pts.length; i++) {
      L += dist(this.pts[i - 1], this.pts[i]);
      this.cum.push(L);
    }
    this.length = L;
  }

  /** Point à la distance s depuis le début (bornée). */
  at(s: number): V3 {
    if (s <= 0) return this.pts[0].slice() as V3;
    if (s >= this.length) return this.pts[this.pts.length - 1].slice() as V3;
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] < s) lo = mid; else hi = mid;
    }
    const k = (s - this.cum[lo]) / (this.cum[hi] - this.cum[lo]);
    const a = this.pts[lo], b = this.pts[hi];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }

  /** Portion du chemin [s0, s1] en points, pour construire un tube. */
  slice(s0: number, s1: number, n = 80): V3[] {
    const out: V3[] = [];
    for (let i = 0; i <= n; i++) out.push(this.at(s0 + ((s1 - s0) * i) / n));
    return out;
  }
}

function dist(a: V3, b: V3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function catmull(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  // Variante centripète (alpha = 0.5) : pas de boucles ni de dépassements.
  const alpha = 0.5;
  const t0 = 0;
  const t1 = t0 + Math.pow(Math.max(dist(p0, p1), 1e-4), alpha);
  const t2 = t1 + Math.pow(Math.max(dist(p1, p2), 1e-4), alpha);
  const t3 = t2 + Math.pow(Math.max(dist(p2, p3), 1e-4), alpha);
  const tt = t1 + (t2 - t1) * t;
  const out: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const a1 = ((t1 - tt) / (t1 - t0)) * p0[c] + ((tt - t0) / (t1 - t0)) * p1[c];
    const a2 = ((t2 - tt) / (t2 - t1)) * p1[c] + ((tt - t1) / (t2 - t1)) * p2[c];
    const a3 = ((t3 - tt) / (t3 - t2)) * p2[c] + ((tt - t2) / (t3 - t2)) * p3[c];
    const b1 = ((t2 - tt) / (t2 - t0)) * a1 + ((tt - t0) / (t2 - t0)) * a2;
    const b2 = ((t3 - tt) / (t3 - t1)) * a2 + ((tt - t1) / (t3 - t1)) * a3;
    out[c] = ((t2 - tt) / (t2 - t1)) * b1 + ((tt - t1) / (t2 - t1)) * b2;
  }
  return out;
}
