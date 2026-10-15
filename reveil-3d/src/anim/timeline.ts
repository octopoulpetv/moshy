// Chorégraphie déterministe : chaque état de la machine est une fonction pure du temps absolu.
// Les instants clés (T) sont dérivés les uns des autres, comme une vraie réaction en chaîne :
// si un domino tombe plus tard, tout ce qui suit se décale avec lui.
import {
  clamp, deg, lerp, smootherstep, easeInOutCubic, easeOutCubic, easeInQuad, springStep, dampedPulse, parabola,
  type V3,
} from './math';
import {
  CLOCK, BALL_R, DOMINO, dominoX, SEESAW, CRADLE, cradleBallX, WHEEL, PUSHER, ARM, RAMP_POINTS, LOWER_RAIL_POINTS, DURATION,
} from './layout';
import { Path } from './path';

// ── Géométrie 2D (plan x-y) ────────────────────────────────────────────────
type P2 = [number, number];
/** Rotation horaire de θ (sens de chute des dominos, vers +x). */
const rotCW = (x: number, y: number, a: number): P2 => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];
const rotCCW = (x: number, y: number, a: number): P2 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

const { th, h } = DOMINO;
const pivot = (i: number): P2 => [dominoX(i) + th / 2, 0];
const dominoPoint = (i: number, a: number, lx: number, ly: number): P2 => {
  const [px, py] = pivot(i);
  const [rx, ry] = rotCW(lx, ly, a);
  return [px + rx, py + ry];
};
const insideDomino = (p: P2, i: number, a: number, eps = 0.002) => {
  const [px, py] = pivot(i);
  const [lx, ly] = rotCCW(p[0] - px, p[1] - py, a);
  return lx > -th - eps && lx < eps && ly > -eps && ly < h + eps;
};

// Bascule : bras de longueur 2·half pivotant autour de (x, pivotY), angle CCW positif.
const seesawLocal = (lx: number, ly: number, a: number): P2 => {
  const [rx, ry] = rotCCW(lx, ly, a);
  return [SEESAW.x + rx, SEESAW.pivotY + ry];
};
const insideSeesaw = (p: P2, a: number) => {
  const [lx, ly] = rotCW(p[0] - SEESAW.x, p[1] - SEESAW.pivotY, a);
  return Math.abs(lx) < SEESAW.half && Math.abs(ly) < SEESAW.th / 2 + 0.004;
};

/** Plus grand angle du domino i sans pénétrer l'obstacle (domino suivant ou bascule). */
function maxAngle(i: number, obstacleAngle: number): number {
  const penetrates = (a: number) => {
    const ft = dominoPoint(i, a, 0, h);
    if (i < DOMINO.count - 1) {
      return insideDomino(ft, i + 1, obstacleAngle) || insideDomino(dominoPoint(i + 1, obstacleAngle, -th, h), i, a);
    }
    const leftTop = seesawLocal(-SEESAW.half, SEESAW.th / 2, obstacleAngle);
    return insideSeesaw(ft, obstacleAngle) || insideDomino(leftTop, i, a) || ft[1] < 0;
  };
  const step = deg(0.5);
  let a = 0;
  while (a < Math.PI / 2 && !penetrates(a + step)) a += step;
  if (a >= Math.PI / 2) return Math.PI / 2;
  let lo = a, hi = a + step;
  for (let k = 0; k < 14; k++) {
    const mid = (lo + hi) / 2;
    if (penetrates(mid)) hi = mid; else lo = mid;
  }
  return lo;
}

/** Chute libre d'un domino (poussée initiale + accélération). */
const freeFall = (tau: number) => {
  if (tau <= 0) return 0;
  const u = tau / DOMINO.fallTime;
  return Math.min(Math.PI / 2, (Math.PI / 2) * (0.22 * u + 0.78 * u * u));
};
const timeToAngle = (a: number) => {
  let tau = 0;
  while (freeFall(tau) < a && tau < 2) tau += 0.0005;
  return tau;
};

// ── Instants clés ──────────────────────────────────────────────────────────
export const T: Record<string, number> = {};
T.alarm = 1.15; // 06:59 → 07:00
T.plungerStart = 1.6;
const PLUNGER_TIME = 0.42;
const plungerTouch = dominoX(0) - th / 2 - CLOCK.w / 2; // distance à parcourir
T.domino0 = T.plungerStart + PLUNGER_TIME * Math.sqrt(plungerTouch / (CLOCK.plunger.reach + 0.04));

export const dominoStart: number[] = [T.domino0];
for (let i = 0; i < DOMINO.count - 1; i++) {
  dominoStart.push(dominoStart[i] + timeToAngle(maxAngle(i, 0)));
}
const last = DOMINO.count - 1;
T.seesawHit = dominoStart[last] + timeToAngle(maxAngle(last, deg(SEESAW.restDeg)));
T.launch = T.seesawHit + 0.07;
T.flight1 = 1.55;
T.snooze1 = T.launch + T.flight1;
T.bounce = 0.42;
const rampPath = new Path(RAMP_POINTS);
const RAMP_V0 = 0.9, RAMP_A = 2.4;
T.rampDuration = (-RAMP_V0 + Math.sqrt(RAMP_V0 * RAMP_V0 + 2 * RAMP_A * rampPath.length)) / RAMP_A;
T.rampArrive = T.snooze1 + T.bounce + T.rampDuration;

// Pendule de Newton
const Q = 0.42; // quart de période
T.liftStart = T.rampArrive + 0.08;
T.liftEnd = T.liftStart + 1.35;
T.release = T.liftEnd + 0.6;
T.impact1 = T.release + Q;
const LIFT = 40, OUT1 = 36, CLIP = 30;
const tauClip = Q * (2 / Math.PI) * Math.asin(CLIP / OUT1);
T.pusherHit = T.impact1 + tauClip;
T.impact2 = T.impact1 + 2 * tauClip;

// Roue
const OMEGA = 0.82; // rad/s
const KICK = 0.26; // rad, élan donné par le poussoir
const wheelDrive = (tau: number) => (tau <= 0 ? 0 : OMEGA * tau + KICK * (1 - Math.exp(-tau / 0.15)));
{
  const target = deg(WHEEL.beadAngle0 - WHEEL.releaseAngle);
  let tau = 0;
  while (wheelDrive(tau) < target) tau += 0.0005;
  T.beadRelease = T.pusherHit + tau;
}
const lowerPath = new Path(LOWER_RAIL_POINTS());
const BEAD_V0 = OMEGA * WHEEL.R, BEAD_A = 1.7;
T.beadDuration = (-BEAD_V0 + Math.sqrt(BEAD_V0 * BEAD_V0 + 2 * BEAD_A * lowerPath.length)) / BEAD_A;
T.beadArrive = T.beadRelease + T.beadDuration;

// Bras mécanique
const sinC = (ARM.pivotY - ARM.headLen - CLOCK.buttonTop) / ARM.len;
const ARM_CONTACT = Math.asin(sinC);
const ARM_PRESS = Math.asin(sinC + CLOCK.button.press / ARM.len);
T.armStart = T.beadArrive + 0.06;
T.snooze2 = T.armStart + 0.48;
T.armUp = T.snooze2 + 0.38;

// Matin
T.dawn0 = 17.4;
T.sunPeak = 22.4;
T.bonjour = 21.4;
T.end = DURATION;

export const paths = { ramp: rampPath, lower: lowerPath };

// ── États ──────────────────────────────────────────────────────────────────
export function seesawAngle(t: number) {
  const tau = t - T.seesawHit;
  if (tau <= 0) return deg(SEESAW.restDeg);
  return lerp(deg(SEESAW.restDeg), deg(SEESAW.flipDeg), springStep(tau, 4.5, 0.6));
}

export function dominoAngles(t: number): number[] {
  const a = new Array(DOMINO.count).fill(0);
  a[last] = Math.min(freeFall(t - dominoStart[last]), maxAngle(last, seesawAngle(t)));
  for (let i = last - 1; i >= 0; i--) a[i] = Math.min(freeFall(t - dominoStart[i]), maxAngle(i, a[i + 1]));
  return a;
}

/** Extension du poussoir latéral du réveil. */
export function plungerExtension(t: number) {
  const out = CLOCK.plunger.reach + 0.04;
  if (t < T.plungerStart) return 0;
  if (t < T.plungerStart + PLUNGER_TIME) return out * easeInQuad((t - T.plungerStart) / PLUNGER_TIME);
  return out * (1 - smootherstep(T.plungerStart + 1.0, T.plungerStart + 1.6, t));
}

export const seesawCup = (a: number): V3 => {
  const [x, y] = seesawLocal(SEESAW.half - 0.1, SEESAW.th / 2 + BALL_R, a);
  return [x, y, 0];
};

const buttonTarget: V3 = [0, CLOCK.buttonTop + BALL_R, 0];

/** La bille orange : bascule → bouton → rampe → godet du pendule. */
export function ballPosition(t: number): V3 {
  if (t < T.launch) return seesawCup(seesawAngle(t));
  if (t < T.snooze1) return parabola(seesawCup(seesawAngle(T.launch)), buttonTarget, 3.35, T.flight1, t - T.launch);
  if (t < T.snooze1 + T.bounce) return parabola(buttonTarget, RAMP_POINTS[0], CLOCK.buttonTop + 0.42, T.bounce, t - T.snooze1);
  const tau = t - T.snooze1 - T.bounce;
  return rampPath.at(RAMP_V0 * tau + 0.5 * RAMP_A * tau * tau);
}

/** Vitesse approximative de la bille (pour l'intensité du son de roulement). */
export function ballRolling(t: number) {
  const tau = t - T.snooze1 - T.bounce;
  return tau > 0 && tau < T.rampDuration;
}

export function buttonDepth(t: number) {
  const p = CLOCK.button.press;
  const first = p * clamp(dampedPulse(t - T.snooze1, 0.04, 6, 0.5), 0, 1) * (t < T.snooze1 + 0.9 ? 1 : 0);
  const pad = armPadBottom(t);
  const second = clamp(CLOCK.buttonTop - pad, 0, p);
  // Petit rebond quand le bras se retire.
  const rebound = t > T.armUp ? p * 0.25 * Math.max(0, dampedPulse(t - T.armUp - 0.12, 0.02, 7, 0.55)) : 0;
  return Math.max(first, second, rebound);
}

// Pendule de Newton : angles des sphères extrêmes (positif = vers +x).
interface Swing { k: 0 | 4; t0: number; A: number; clip?: number }
const swings: Swing[] = (() => {
  const list: Swing[] = [{ k: 0, t0: T.impact1, A: OUT1, clip: CLIP }];
  let tt = T.impact2;
  let A = 24;
  let k: 0 | 4 = 4;
  while (tt < DURATION + 2 && A > 0.4) {
    list.push({ k, t0: tt, A });
    tt += 2 * Q;
    A *= 0.68;
    k = k === 4 ? 0 : 4;
  }
  return list;
})();

export function cradleAngles(t: number): number[] {
  const out = [0, 0, 0, 0, 0];
  // Sphère droite : soulevée, tenue, relâchée.
  if (t >= T.liftStart && t < T.release) {
    out[4] = deg(LIFT) * easeInOutCubic(clamp((t - T.liftStart) / (T.liftEnd - T.liftStart)));
  } else if (t >= T.release && t < T.impact1) {
    out[4] = deg(LIFT) * Math.cos((Math.PI / 2) * ((t - T.release) / Q));
  }
  for (const s of swings) {
    const tau = t - s.t0;
    const dur = s.clip ? 2 * tauClip : 2 * Q;
    if (tau < 0 || tau >= dur) continue;
    let a: number;
    if (s.clip) {
      const tt = tau < tauClip ? tau : 2 * tauClip - tau;
      a = s.A * Math.sin((Math.PI / 2) * (tt / Q));
    } else {
      a = s.A * Math.sin(Math.PI * (tau / (2 * Q)));
    }
    out[s.k] = deg(a) * (s.k === 0 ? -1 : 1);
  }
  return out;
}

export const cradleImpacts = (): number[] => [T.impact1, ...swings.slice(1).map((s) => s.t0)];

export function cradleBallPos(k: number, a: number): V3 {
  return [cradleBallX(k) + CRADLE.L * Math.sin(a), CRADLE.pivotY - CRADLE.L * Math.cos(a), 0];
}

/** Tige télescopique qui soulève la sphère droite. */
export const LIFTER_PIVOT: V3 = [-1.78, 0.17, 0];
export function lifterTip(t: number): V3 {
  const a = cradleAngles(t)[4];
  const bottom = cradleBallPos(4, a);
  bottom[1] -= CRADLE.r;
  if (t < T.release) return bottom;
  // Rétractation rapide au moment du lâcher.
  const rest = cradleBallPos(4, 0);
  rest[1] -= CRADLE.r;
  const dir = [rest[0] - LIFTER_PIVOT[0], rest[1] - LIFTER_PIVOT[1]];
  const n = Math.hypot(dir[0], dir[1]);
  const retracted: V3 = [LIFTER_PIVOT[0] + (dir[0] / n) * 0.56, LIFTER_PIVOT[1] + (dir[1] / n) * 0.56, 0];
  const held = cradleBallPos(4, deg(LIFT));
  held[1] -= CRADLE.r;
  const k = easeOutCubic(clamp((t - T.release) / 0.14));
  return [lerp(held[0], retracted[0], k), lerp(held[1], retracted[1], k), 0];
}

export function pusherOffset(t: number) {
  const tau = t - T.pusherHit;
  if (tau <= 0) return 0;
  const out = PUSHER.travel * easeOutCubic(clamp(tau / 0.28));
  return out * (1 - smootherstep(2.4, 4.2, tau));
}

/** Rotation de la roue (radians, négatif = sens horaire). */
export function wheelAngle(t: number) {
  const tau = t - T.pusherHit;
  if (tau <= 0) return 0;
  const tr = T.beadRelease - T.pusherHit;
  if (tau <= tr) return -wheelDrive(tau);
  const td = 3.2;
  const u = Math.min(tau - tr, td);
  const w = OMEGA + KICK / 0.15 * Math.exp(-tr / 0.15);
  return -(wheelDrive(tr) + w * (u - (u * u) / (2 * td)));
}

/** La bille ambrée portée par la roue puis lâchée sur le rail inférieur. */
export function beadPosition(t: number): V3 {
  if (t < T.beadRelease) {
    const a = deg(WHEEL.beadAngle0) + wheelAngle(t);
    const r = WHEEL.R - 0.02;
    return [WHEEL.x + r * Math.cos(a), WHEEL.y + r * Math.sin(a), WHEEL.z + 0.12];
  }
  const tau = t - T.beadRelease;
  const p = lowerPath.at(BEAD_V0 * tau + 0.5 * BEAD_A * tau * tau);
  // Transition douce de la jante vers le rail (la bille quitte son godet).
  const k = smootherstep(0, 0.22, tau);
  if (k < 1) {
    const a = deg(WHEEL.releaseAngle);
    const r = WHEEL.R - 0.02;
    const from: V3 = [WHEEL.x + r * Math.cos(a), WHEEL.y + r * Math.sin(a), WHEEL.z + 0.12];
    return [lerp(from[0], p[0], k), lerp(from[1], p[1], k) + 0.05 * Math.sin(Math.PI * k), lerp(from[2], p[2], k)];
  }
  return p;
}
export const beadRolling = (t: number) => t > T.beadRelease && t < T.beadArrive;

export function triggerFlap(t: number) {
  return deg(55) * clamp(dampedPulse(t - T.beadArrive, 0.06, 2.2, 0.55), -0.3, 1);
}

/** Angle du bras (positif = abaissé sous l'horizontale). */
export function armAngle(t: number) {
  const rest = deg(ARM.restDeg);
  if (t < T.armStart) return rest;
  if (t < T.snooze2) return lerp(rest, ARM_CONTACT, easeInQuad((t - T.armStart) / (T.snooze2 - T.armStart)));
  if (t < T.snooze2 + 0.09) return lerp(ARM_CONTACT, ARM_PRESS, easeOutCubic((t - T.snooze2) / 0.09));
  if (t < T.armUp) return ARM_PRESS;
  const k = springStep(t - T.armUp, 1.3, 0.62);
  return lerp(ARM_PRESS, rest, k);
}
export function armPadBottom(t: number) {
  return ARM.pivotY - ARM.len * Math.sin(armAngle(t)) - ARM.headLen;
}

// ── Réveil ─────────────────────────────────────────────────────────────────
const roll = (from: number, to: number, t0: number, dur: number, t: number) =>
  t < t0 ? from : t >= t0 + dur ? to : from + Math.floor(((t - t0) / dur) * (to - from + 1));

/** Minutes affichées (06:59 = 419). */
export function displayMinutes(t: number) {
  if (t < T.alarm) return 6 * 60 + 59;
  if (t < T.snooze1 + 0.06) return 7 * 60;
  if (t < T.snooze2 + 0.06) return roll(420, 429, T.snooze1 + 0.06, 0.62, t);
  return roll(429, 438, T.snooze2 + 0.06, 0.62, t);
}
export const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;

export function displayLabel(t: number): string {
  if (t >= T.bonjour) return 'BONJOUR';
  if (t >= T.snooze2) return 'SNOOZE ×2';
  if (t >= T.snooze1) return 'SNOOZE ×1';
  if (t >= T.alarm && t < T.alarm + 1.5) return Math.floor((t - T.alarm) * 4) % 2 === 0 ? 'ALARME' : '';
  return '';
}

/** Intensité lumineuse de l'affichage (1 = normal), avec éclats aux changements. */
export function displayGlow(t: number) {
  let g = 1;
  for (const tc of [T.alarm, T.snooze1, T.snooze2]) {
    const d = t - tc;
    if (d >= 0 && d < 1.2) g += 1.4 * Math.exp(-d * 5);
  }
  if (t >= T.alarm && t < T.alarm + 1.5) g *= 0.75 + 0.25 * (Math.floor((t - T.alarm) * 8) % 2);
  return g;
}

/** Tremblement du réveil pendant la sonnerie. */
export function clockShake(t: number) {
  const env = t > T.alarm && t < T.alarm + 1.3 ? Math.sin(Math.PI * ((t - T.alarm) / 1.3)) : 0;
  return env * 0.012 * Math.sin(t * 2 * Math.PI * 23);
}

/** Lever du jour : 0 = nuit, 1 = plein matin. */
export const dawn = (t: number) => smootherstep(T.dawn0, T.sunPeak, t);

/** Événements sonores dérivés de la même chorégraphie. */
export function soundEvents(): { t: number; type: string; v?: number; d?: number }[] {
  const ev: { t: number; type: string; v?: number; d?: number }[] = [];
  ev.push({ t: T.alarm, type: 'change' }, { t: T.alarm, type: 'alarm' });
  ev.push({ t: T.plungerStart, type: 'servo', d: PLUNGER_TIME });
  dominoStart.forEach((s, i) => ev.push({ t: s, type: 'domino', v: 0.55 + 0.05 * i }));
  ev.push({ t: T.seesawHit, type: 'thunk' }, { t: T.launch, type: 'whoosh', d: T.flight1 });
  ev.push({ t: T.snooze1, type: 'click' }, { t: T.snooze1 + 0.06, type: 'change' });
  for (let m = 0; m < 9; m++) ev.push({ t: T.snooze1 + 0.06 + (m * 0.62) / 9, type: 'tick' });
  ev.push({ t: T.snooze1 + T.bounce, type: 'roll', d: T.rampDuration });
  ev.push({ t: T.rampArrive, type: 'tock' }, { t: T.liftStart, type: 'servo', d: T.liftEnd - T.liftStart });
  cradleImpacts().forEach((c, i) => ev.push({ t: c, type: 'clack', v: Math.pow(0.7, i) }));
  ev.push({ t: T.pusherHit, type: 'thunk', v: 0.6 });
  const tr = T.beadRelease - T.pusherHit;
  for (let a = deg(360 / WHEEL.spokes); ; a += deg(360 / WHEEL.spokes)) {
    let tau = 0;
    while (wheelDrive(tau) < a && tau < tr) tau += 0.002;
    if (tau >= tr) break;
    ev.push({ t: T.pusherHit + tau, type: 'ratchet' });
  }
  ev.push({ t: T.beadRelease, type: 'roll', d: T.beadDuration });
  ev.push({ t: T.beadArrive, type: 'tock' }, { t: T.armStart, type: 'servo', d: 0.5 });
  ev.push({ t: T.snooze2, type: 'click' }, { t: T.snooze2 + 0.06, type: 'change' });
  for (let m = 0; m < 9; m++) ev.push({ t: T.snooze2 + 0.06 + (m * 0.62) / 9, type: 'tick' });
  ev.push({ t: T.bonjour, type: 'chime' });
  return ev.sort((a, b) => a.t - b.t);
}
