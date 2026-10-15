// Dominos numérotés, bascule, bille orange et rampe vers le pendule.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DOMINO, dominoX, SEESAW, BALL_R, RAMP_POINTS } from '../anim/layout';
import { paths } from '../anim/timeline';
import { type Materials, textTexture, haloTexture } from '../scene/materials';
import { railPair, vec } from './util';

export function buildDominoes(m: Materials) {
  const group = new THREE.Group();
  const pivots: THREE.Group[] = [];
  const { th, h, w } = DOMINO;
  const frameGeo = new RoundedBoxGeometry(th, h, w, 2, 0.012);
  const panelGeo = new THREE.PlaneGeometry(w - 0.07, h - 0.07);
  const numGeo = new THREE.PlaneGeometry(w * 0.82, w * 0.82);
  for (let i = 0; i < DOMINO.count; i++) {
    // Le groupe est placé sur l'arête avant inférieure : la rotation s'y fait naturellement.
    const pivot = new THREE.Group();
    pivot.position.set(dominoX(i) + th / 2, 0, 0);
    group.add(pivot);
    pivots.push(pivot);
    const frame = new THREE.Mesh(frameGeo, m.silver);
    frame.position.set(-th / 2, h / 2, 0);
    frame.castShadow = frame.receiveShadow = true;
    pivot.add(frame);
    const tex = textTexture(String(i + 1), { font: '700 190px "Helvetica Neue", Arial, sans-serif', color: '#fff0d0' });
    const numMat = new THREE.MeshStandardMaterial({
      map: tex.texture, transparent: true, emissive: '#fff0d0', emissiveMap: tex.texture, emissiveIntensity: 0.55,
      roughness: 0.4, depthWrite: false,
    });
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(panelGeo, m.dominoPanel);
      panel.position.set(-th / 2 + side * (th / 2 + 0.001), h / 2, 0);
      panel.rotation.y = (side * Math.PI) / 2;
      pivot.add(panel);
      const num = new THREE.Mesh(numGeo, numMat);
      num.position.set(-th / 2 + side * (th / 2 + 0.002), h * 0.56, 0);
      num.rotation.y = (side * Math.PI) / 2;
      pivot.add(num);
    }
  }
  return { group, pivots };
}

export function buildSeesaw(m: Materials) {
  const group = new THREE.Group();
  // Socle en A.
  const triShape = new THREE.Shape();
  triShape.moveTo(-0.16, 0);
  triShape.lineTo(0.16, 0);
  triShape.lineTo(0, SEESAW.pivotY);
  triShape.closePath();
  const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.03, bevelEnabled: false });
  for (const z of [-0.12, 0.09]) {
    const tri = new THREE.Mesh(triGeo, m.darkMetal);
    tri.position.set(SEESAW.x, 0, z);
    tri.castShadow = true;
    group.add(tri);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 16), m.silver);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(SEESAW.x, SEESAW.pivotY, 0);
  group.add(axle);

  const arm = new THREE.Group();
  arm.position.set(SEESAW.x, SEESAW.pivotY, 0);
  group.add(arm);
  const plank = new THREE.Mesh(new RoundedBoxGeometry(SEESAW.half * 2, SEESAW.th, SEESAW.w, 2, 0.012), m.darkMetal);
  plank.castShadow = plank.receiveShadow = true;
  arm.add(plank);
  // Liseré orange sur la tranche avant de la planche.
  const edge = new THREE.Mesh(new THREE.BoxGeometry(SEESAW.half * 2 - 0.02, 0.014, 0.006), m.orangeEdge);
  edge.position.z = SEESAW.w / 2 + 0.002;
  arm.add(edge);
  // Godet de lancement.
  const cup = new THREE.Mesh(new THREE.TorusGeometry(BALL_R * 0.9, 0.014, 10, 28), m.silver);
  cup.rotation.x = Math.PI / 2;
  cup.position.set(SEESAW.half - 0.1, SEESAW.th / 2 + 0.03, 0);
  arm.add(cup);
  return { group, arm };
}

/** Une bille lumineuse avec sa lumière et son halo. */
export function buildGlowBall(mat: THREE.Material, r: number, color: string, intensity: number) {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat);
  group.add(sphere);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55,
  }));
  halo.scale.setScalar(r * 7);
  group.add(halo);
  const light = new THREE.PointLight(color, intensity, 3.2, 2);
  group.add(light);
  return { group, light, halo, baseIntensity: intensity };
}

export function buildRamp(m: Materials) {
  const group = new THREE.Group();
  // Rails à partir du bord du réveil (sur le dessus, la bille roule directement sur le boîtier).
  const p = paths.ramp;
  let s0 = 0;
  for (let i = 0; i < p.pts.length; i++) {
    if (p.pts[i][0] <= RAMP_POINTS[2][0] + 0.06) { s0 = p.cum[i]; break; }
  }
  group.add(railPair(p.slice(s0, p.length, 60), BALL_R, m.silver, m.steel));
  // Godet d'arrivée.
  const end = vec(RAMP_POINTS[RAMP_POINTS.length - 1]);
  const cup = new THREE.Mesh(new THREE.TorusGeometry(BALL_R * 0.95, 0.016, 10, 28), m.orangeMetal);
  cup.rotation.x = Math.PI / 2;
  cup.position.set(end.x, end.y - BALL_R * 0.55, end.z);
  group.add(cup);
  const stop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), m.steel);
  stop.position.set(end.x - BALL_R - 0.02, end.y - 0.02, 0);
  group.add(stop);
  return { group };
}
