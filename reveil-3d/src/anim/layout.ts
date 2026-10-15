// Disposition de la machine dans l'espace (unités ≈ mètres, y vers le haut, la scène regarde vers +z).
// Toutes les positions sont ici : objets, chorégraphie et caméra lisent les mêmes valeurs.
import type { V3 } from './math';

export const FPS = 30;
export const DURATION = 24;

export const CLOCK = {
  x: 0, z: 0,
  w: 2.4, h: 1.45, d: 0.75,
  feet: 0.05,
  get bottom() { return this.feet; },
  get top() { return this.feet + this.h; },
  get centerY() { return this.feet + this.h / 2; },
  get front() { return this.d / 2; },
  button: { w: 0.72, h: 0.14, d: 0.32, press: 0.07 },
  get buttonTop() { return this.top + this.button.h; },
  display: { w: 1.92, h: 0.86, y: 0.8 },
  // Poussoir latéral qui sort à 7 h 00 et renverse le premier domino.
  plunger: { y: 0.62, reach: 0.36 },
};

export const BALL_R = 0.085;

export const DOMINO = {
  count: 9,
  x0: 1.62,
  spacing: 0.4,
  th: 0.075,
  h: 0.86,
  w: 0.44,
  fallTime: 0.5, // temps de chute libre jusqu'à l'horizontale
};
export const dominoX = (i: number) => DOMINO.x0 + i * DOMINO.spacing;

export const SEESAW = {
  x: 5.62,
  pivotY: 0.32,
  half: 0.66,
  th: 0.05,
  w: 0.3,
  restDeg: -14, // extrémité gauche relevée
  flipDeg: 16, // extrémité droite relevée après l'impact
};

export const CRADLE = {
  x: -3.5,
  count: 5,
  r: 0.13,
  pivotY: 1.45,
  L: 0.9,
  halfDepth: 0.32,
};
export const cradleBallX = (k: number) => CRADLE.x + (k - 2) * CRADLE.r * 2;

export const WHEEL = {
  x: -6.4, y: 1.75, z: -0.45,
  R: 1.35,
  spokes: 14,
  pins: 7,
  pinAngle0: -52, // broche frappée par le poussoir (degrés)
  beadAngle0: 150, // bille portée par la jante
  releaseAngle: -35,
};

// Poussoir horizontal entre le pendule et la roue.
export const PUSHER = {
  y: WHEEL.y + WHEEL.R * Math.sin((WHEEL.pinAngle0 * Math.PI) / 180),
  xLeft: WHEEL.x + WHEEL.R * Math.cos((WHEEL.pinAngle0 * Math.PI) / 180) + 0.08,
  xRight: -4.6,
  travel: 0.36,
};

// Bras mécanique derrière le réveil.
export const ARM = {
  postX: 0, postZ: -1.05,
  pivotY: 2.5,
  len: 1.25,
  restDeg: -26, // relevé (au-dessus de l'horizontale)
  headLen: 0.16,
};

// Rampe : du dessus du réveil jusqu'au godet du pendule.
export const RAMP_POINTS: V3[] = [
  [-0.62, CLOCK.top + BALL_R, 0],
  [-1.05, CLOCK.top + BALL_R, 0],
  [-1.32, CLOCK.top - 0.05, 0],
  [-1.5, 1.18, 0],
  [-1.68, 0.8, 0],
  [-1.86, 0.55, 0],
  [-2.0, 0.47, 0],
];
export const RAMP_RAIL_FROM = 2; // les rails commencent au bord du réveil

// Rail inférieur : de la sortie de la roue jusqu'au déclencheur du bras.
export const LOWER_RAIL_POINTS = (): V3[] => {
  const a = (WHEEL.releaseAngle * Math.PI) / 180;
  // Départ juste à l'extérieur de la jante (les broches ne doivent pas toucher le rail).
  const start: V3 = [WHEEL.x + (WHEEL.R + 0.14) * Math.cos(a), WHEEL.y + (WHEEL.R + 0.14) * Math.sin(a), WHEEL.z + 0.12];
  return [
    start,
    [-4.7, 0.86, -0.55],
    [-3.5, 0.72, -0.62],
    [-2.1, 0.6, -0.72],
    [-1.0, 0.52, -0.92],
    [-0.2, 0.5, -1.05],
  ];
};

export const SUN = { x: 0, z: -11, r: 3.6, yStart: -4.2, yEnd: 2.6 };
