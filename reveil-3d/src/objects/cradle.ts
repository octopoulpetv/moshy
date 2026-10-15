// Pendule de Newton, tige de levage et poussoir vers la roue.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CRADLE, cradleBallX, PUSHER } from '../anim/layout';
import { LIFTER_PIVOT } from '../anim/timeline';
import type { Materials } from '../scene/materials';
import { rodBetween, placeRod, vec } from './util';

export function buildCradle(m: Materials) {
  const group = new THREE.Group();
  const x0 = cradleBallX(0) - 0.55, x1 = cradleBallX(4) + 0.55;
  const D = CRADLE.halfDepth;

  const base = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0 + 0.2, 0.06, D * 2 + 0.3, 3, 0.02), m.darkMetal);
  base.position.set((x0 + x1) / 2, 0.03, 0);
  base.receiveShadow = base.castShadow = true;
  group.add(base);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.21, 0.008, D * 2 + 0.31), m.orangeEdge);
  trim.position.set((x0 + x1) / 2, 0.03, 0); // liseré sur le pourtour du socle
  group.add(trim);

  // Arceaux : deux cadres (avant/arrière).
  const top = CRADLE.pivotY + 0.02;
  for (const z of [-D, D]) {
    group.add(rodBetween(new THREE.Vector3(x0, 0.06, z), new THREE.Vector3(x0, top, z), 0.022, m.silver));
    group.add(rodBetween(new THREE.Vector3(x1, 0.06, z), new THREE.Vector3(x1, top, z), 0.022, m.silver));
    group.add(rodBetween(new THREE.Vector3(x0, top, z), new THREE.Vector3(x1, top, z), 0.022, m.silver));
    for (const x of [x0, x1]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 10), m.silver);
      knob.position.set(x, top, z);
      group.add(knob);
    }
  }

  // Les cinq pendules.
  const pendulums: THREE.Group[] = [];
  const sphereGeo = new THREE.SphereGeometry(CRADLE.r, 40, 28);
  for (let k = 0; k < CRADLE.count; k++) {
    const p = new THREE.Group();
    p.position.set(cradleBallX(k), CRADLE.pivotY, 0);
    group.add(p);
    const s = new THREE.Mesh(sphereGeo, m.sphere);
    s.position.y = -CRADLE.L;
    s.castShadow = s.receiveShadow = true;
    p.add(s);
    for (const z of [-D, D]) {
      p.add(rodBetween(new THREE.Vector3(0, 0, z), new THREE.Vector3(0, -CRADLE.L + CRADLE.r * 0.9, 0), 0.004, m.string, 6));
    }
    pendulums.push(p);
  }

  // Tige télescopique de levage.
  const lifterBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 20), m.darkMetal);
  lifterBase.position.set(LIFTER_PIVOT[0], 0.06, LIFTER_PIVOT[2]);
  group.add(lifterBase);
  const lifterSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 14), m.steel);
  const lifterRod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1, 12), m.orangeMetal);
  const lifterTipM = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), m.orangeMetal);
  group.add(lifterSleeve, lifterRod, lifterTipM);

  // Poussoir et ses guides.
  const pusher = new THREE.Group();
  pusher.position.set(PUSHER.xLeft, PUSHER.y, 0);
  group.add(pusher);
  const len = PUSHER.xRight - PUSHER.xLeft;
  const pusherRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 16), m.steel);
  pusherRod.rotation.z = Math.PI / 2;
  pusherRod.position.x = len / 2;
  pusherRod.castShadow = true;
  pusher.add(pusherRod);
  for (const [x, mat] of [[0, m.orangeMetal], [len, m.silver]] as const) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 18), mat);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = x;
    pusher.add(cap);
  }
  for (const x of [PUSHER.xLeft + 0.3, PUSHER.xRight - 0.25]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20), m.silver);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(x, PUSHER.y, 0);
    group.add(ring);
    group.add(rodBetween(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, PUSHER.y - 0.045, 0), 0.012, m.steel, 8));
  }

  return {
    group, pendulums, pusher,
    setLifter(tip: THREE.Vector3) {
      const a = vec(LIFTER_PIVOT);
      const dir = tip.clone().sub(a);
      const sleeveEnd = a.clone().addScaledVector(dir.clone().normalize(), Math.min(0.5, dir.length() * 0.7));
      placeRod(lifterSleeve, a, sleeveEnd);
      placeRod(lifterRod, a, tip);
      lifterTipM.position.copy(tip);
    },
  };
}
