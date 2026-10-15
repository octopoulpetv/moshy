// Grande roue ajourée, rail inférieur, déclencheur et bras mécanique orange.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WHEEL, ARM, BALL_R } from '../anim/layout';
import { paths } from '../anim/timeline';
import type { Materials } from '../scene/materials';
import { rodBetween, railPair } from './util';

const rad = (d: number) => (d * Math.PI) / 180;

export function buildWheel(m: Materials) {
  const group = new THREE.Group();
  const wheel = new THREE.Group();
  wheel.position.set(WHEEL.x, WHEEL.y, WHEEL.z);
  group.add(wheel);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.R, 0.045, 14, 160), m.silver);
  rim.castShadow = true;
  wheel.add(rim);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.R - 0.13, 0.014, 8, 140), m.steel);
  wheel.add(inner);
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.R + 0.05, 0.008, 6, 160), m.orangeEdge);
  wheel.add(glowRing);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 32), m.darkMetal);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 24), m.orangeMetal);
  hubCap.rotation.x = Math.PI / 2;
  wheel.add(hubCap);
  for (let i = 0; i < WHEEL.spokes; i++) {
    const a = (i / WHEEL.spokes) * Math.PI * 2;
    const p0 = new THREE.Vector3(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0);
    const p1 = new THREE.Vector3(Math.cos(a) * (WHEEL.R - 0.03), Math.sin(a) * (WHEEL.R - 0.03), 0);
    wheel.add(rodBetween(p0, p1, 0.011, m.steel, 6));
  }
  // Broches (frappées par le poussoir) : elles dépassent vers l'avant jusqu'à z = 0.
  for (let i = 0; i < WHEEL.pins; i++) {
    const a = rad(WHEEL.pinAngle0) + (i / WHEEL.pins) * Math.PI * 2;
    const r = WHEEL.R - 0.02;
    const pin = rodBetween(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0),
      new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -WHEEL.z + 0.06), 0.022, m.silver, 10);
    wheel.add(pin);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), m.orangeMetal);
    tip.position.set(Math.cos(a) * r, Math.sin(a) * r, -WHEEL.z + 0.06);
    wheel.add(tip);
  }
  // Godet qui porte la bille.
  const ba = rad(WHEEL.beadAngle0);
  const cup = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 24), m.orangeMetal);
  cup.position.set(Math.cos(ba) * (WHEEL.R - 0.02), Math.sin(ba) * (WHEEL.R - 0.02), 0.12);
  wheel.add(cup);
  wheel.add(rodBetween(new THREE.Vector3(Math.cos(ba) * WHEEL.R, Math.sin(ba) * WHEEL.R, 0),
    new THREE.Vector3(Math.cos(ba) * (WHEEL.R - 0.02), Math.sin(ba) * (WHEEL.R - 0.02), 0.1), 0.01, m.steel, 6));

  // Pied en A derrière la roue + axe.
  const zs = WHEEL.z - 0.3;
  const axleTop = new THREE.Vector3(WHEEL.x, WHEEL.y, zs);
  for (const dx of [-0.95, 0.95]) group.add(rodBetween(new THREE.Vector3(WHEEL.x + dx, 0, zs), axleTop, 0.035, m.darkMetal));
  group.add(rodBetween(new THREE.Vector3(WHEEL.x - 0.6, 0.62, zs), new THREE.Vector3(WHEEL.x + 0.6, 0.62, zs), 0.02, m.steel));
  group.add(rodBetween(axleTop, new THREE.Vector3(WHEEL.x, WHEEL.y, WHEEL.z), 0.04, m.silver));

  // Rail inférieur jusqu'au bras.
  const lp = paths.lower;
  group.add(railPair(lp.slice(0.12, lp.length, 120), BALL_R * 0.9, m.silver, m.steel, 0.05, 0.6));

  return { group, wheel };
}

export function buildArm(m: Materials) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, ARM.pivotY, 24), m.darkMetal);
  post.position.set(ARM.postX, ARM.pivotY / 2, ARM.postZ);
  post.castShadow = true;
  group.add(post);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 32), m.darkMetal);
  foot.position.set(ARM.postX, 0.025, ARM.postZ);
  group.add(foot);
  for (const y of [0.9, 1.9]) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 28), m.silver);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(ARM.postX, y, ARM.postZ);
    group.add(collar);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 28), m.silver);
  hub.rotation.z = Math.PI / 2;
  hub.position.set(ARM.postX, ARM.pivotY, ARM.postZ);
  group.add(hub);

  const arm = new THREE.Group();
  arm.position.set(ARM.postX, ARM.pivotY, ARM.postZ);
  group.add(arm);
  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.09, ARM.len + 0.1, 3, 0.03), m.orangeMetal);
  bar.position.z = ARM.len / 2;
  bar.castShadow = true;
  arm.add(bar);
  const head = new THREE.Group(); // reste vertical (contre-rotation)
  head.position.z = ARM.len;
  arm.add(head);
  const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 20), m.silver);
  knuckle.rotation.z = Math.PI / 2;
  head.add(knuckle);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, ARM.headLen, 14), m.steel);
  stem.position.y = -ARM.headLen / 2;
  head.add(stem);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 28), m.orangeEdge);
  pad.position.y = -ARM.headLen + 0.0125;
  pad.castShadow = true;
  head.add(pad);

  // Déclencheur : volet frappé par la bille au bout du rail.
  const flapPivot = new THREE.Group();
  flapPivot.position.set(ARM.postX - 0.08, 0.62, ARM.postZ);
  group.add(flapPivot);
  const flap = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.2, 0.14, 2, 0.006), m.orangeMetal);
  flap.position.y = -0.1;
  flapPivot.add(flap);

  return { group, arm, head, flapPivot };
}
