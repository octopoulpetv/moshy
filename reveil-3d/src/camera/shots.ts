// Découpage caméra : plans successifs (coupes franches entre plans), trajectoires lisses à l'intérieur
// d'un plan, suivi pondéré des billes. Tout dépend des instants de la chorégraphie (T).
import * as THREE from 'three';
import { sampleKeys, smoothstep, type V3 } from '../anim/math';
import { T, ballPosition, beadPosition } from '../anim/timeline';

interface CamKey { t: number; pos: V3; tgt: V3; fov: number }
interface Shot { start: number; keys: CamKey[]; track?: (t: number) => { p: V3; w: number } | null }

const window_ = (t: number, a: number, b: number, fade = 0.35) => smoothstep(a, a + fade, t) * (1 - smoothstep(b - fade, b, t));

export function buildShots(): Shot[] {
  const s1 = T.snooze1;
  return [
    { // Plan 1 : le réveil, les dominos, la bascule, le vol de la bille, premier report.
      start: 0,
      keys: [
        { t: 0, pos: [0.55, 1.15, 4.1], tgt: [0, 0.9, 0], fov: 30 },
        { t: 1.35, pos: [0.2, 0.92, 2.85], tgt: [0, 0.86, 0.2], fov: 30 },
        { t: 2.3, pos: [1.25, 1.2, 2.75], tgt: [2.3, 0.45, 0], fov: 32 },
        { t: 3.15, pos: [2.6, 1.15, 2.55], tgt: [3.6, 0.42, 0], fov: 32 },
        { t: T.seesawHit, pos: [3.95, 1.25, 2.7], tgt: [5.1, 0.5, 0], fov: 33 },
        { t: T.launch + 0.6, pos: [4.7, 1.45, 7.2], tgt: [2.7, 1.5, 0], fov: 38 },
        { t: s1 - 0.35, pos: [2.1, 1.65, 5.6], tgt: [0.4, 1.35, 0], fov: 38 },
        { t: s1 + 0.1, pos: [0.85, 2.1, 2.95], tgt: [0, 1.62, 0], fov: 34 },
        { t: s1 + 0.9, pos: [0.5, 1.5, 2.45], tgt: [0, 1.1, 0.2], fov: 33 },
      ],
      track: (t) => ({ p: ballPosition(t), w: 0.55 * window_(t, T.launch - 0.1, s1 + 0.05, 0.4) }),
    },
    { // Plan 2 : la rampe et le pendule de Newton, en plan rapproché.
      start: s1 + 0.9,
      keys: [
        { t: s1 + 0.9, pos: [-0.55, 1.75, 2.35], tgt: [-1.25, 1.1, 0], fov: 34 },
        { t: T.rampArrive, pos: [-1.35, 1.25, 2.05], tgt: [-2.3, 0.7, 0], fov: 33 },
        { t: T.liftEnd, pos: [-2.05, 1.0, 1.75], tgt: [-2.65, 0.8, 0], fov: 32 },
        { t: T.impact1 + 0.05, pos: [-2.8, 0.88, 1.6], tgt: [-3.3, 0.68, 0], fov: 31 },
        { t: T.impact2 + 0.3, pos: [-3.85, 0.95, 1.75], tgt: [-4.6, 0.72, -0.1], fov: 31 },
      ],
      track: (t) => ({ p: ballPosition(t), w: 0.6 * window_(t, s1 + 0.9, T.rampArrive + 0.1, 0.3) }),
    },
    { // Plan 3 : la grande roue, puis élargissement vers le rail et le réveil.
      start: T.impact2 + 0.3,
      keys: [
        { t: T.impact2 + 0.3, pos: [-4.35, 1.55, 3.7], tgt: [-6.15, 1.5, -0.4], fov: 37 },
        { t: T.impact2 + 1.9, pos: [-4.8, 2.1, 4.0], tgt: [-6.3, 1.6, -0.4], fov: 37 },
        { t: T.beadRelease - 0.2, pos: [-4.2, 2.0, 4.5], tgt: [-5.6, 1.2, -0.4], fov: 38 },
        { t: T.beadRelease + 1.0, pos: [-2.7, 2.3, 5.7], tgt: [-2.6, 0.8, -0.6], fov: 40 },
        { t: T.beadArrive, pos: [-0.6, 2.45, 5.3], tgt: [-0.3, 1.25, -0.6], fov: 40 },
      ],
      track: (t) => ({ p: beadPosition(t), w: 0.45 * window_(t, T.beadRelease - 0.3, T.beadArrive + 0.2, 0.5) }),
    },
    { // Plan 4 : gros plan sur le bras et le bouton.
      start: T.beadArrive,
      keys: [
        { t: T.beadArrive, pos: [1.45, 2.35, 2.2], tgt: [0, 2.1, -0.25], fov: 38 },
        { t: T.snooze2 + 0.35, pos: [1.2, 2.2, 1.95], tgt: [0, 1.85, -0.2], fov: 36 },
      ],
    },
    { // Plan 5 : face au réveil, l'heure monte à 07:18.
      start: T.snooze2 + 0.35,
      keys: [
        { t: T.snooze2 + 0.35, pos: [0.42, 1.02, 2.95], tgt: [0, 0.95, 0], fov: 30 },
        { t: 17.0, pos: [0.25, 1.08, 2.6], tgt: [0, 0.95, 0], fov: 30 },
      ],
    },
    { // Plan 6 : recul, lever du soleil, retour final sur le réveil.
      start: 17.0,
      keys: [
        { t: 17.0, pos: [1.6, 2.0, 6.6], tgt: [0, 1.0, 0], fov: 38 },
        { t: 19.0, pos: [0.6, 2.55, 12.5], tgt: [0, 1.5, -2], fov: 42 },
        { t: 20.9, pos: [0.05, 2.0, 11.8], tgt: [0, 1.75, -4], fov: 40 },
        { t: 22.3, pos: [0, 1.3, 6.2], tgt: [0, 1.0, 0], fov: 34 },
        { t: 23.35, pos: [0, 1.08, 4.0], tgt: [0, 0.98, 0], fov: 30 },
        { t: 24, pos: [0, 1.07, 3.9], tgt: [0, 0.98, 0], fov: 30 },
      ],
    },
  ];
}

export class CameraRig {
  private shots = buildShots();
  readonly focus = new THREE.Vector3();

  apply(cam: THREE.PerspectiveCamera, t: number) {
    let shot = this.shots[0];
    for (const s of this.shots) if (t >= s.start) shot = s;
    const keys = shot.keys.map((k) => ({ t: k.t, v: [...k.pos, ...k.tgt, k.fov] }));
    const v = sampleKeys(keys, t);
    const tgt = new THREE.Vector3(v[3], v[4], v[5]);
    const tr = shot.track?.(t);
    if (tr && tr.w > 0) tgt.lerp(new THREE.Vector3(...tr.p), tr.w);
    cam.position.set(v[0], v[1], v[2]);
    cam.fov = v[6];
    cam.lookAt(tgt);
    cam.updateProjectionMatrix();
    this.focus.copy(tgt);
    return cam.position.distanceTo(tgt);
  }
}
