// Le réveil rétro : boîtier arrondi, bordure orange, affichage sept segments, bouton SNOOZE, poussoir latéral.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CLOCK } from '../anim/layout';
import { type Materials, textTexture } from '../scene/materials';

// Segments allumés par chiffre (ordre a b c d e f g).
const DIGITS: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0], '2': [1, 1, 0, 1, 1, 0, 1], '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1], '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1], '9': [1, 1, 1, 1, 0, 1, 1],
};

/** Segment hexagonal biseauté (forme classique des afficheurs). */
function segmentGeometry(len: number, thick: number) {
  const s = new THREE.Shape();
  const h = thick / 2;
  s.moveTo(-len / 2, 0);
  s.lineTo(-len / 2 + h, h);
  s.lineTo(len / 2 - h, h);
  s.lineTo(len / 2, 0);
  s.lineTo(len / 2 - h, -h);
  s.lineTo(-len / 2 + h, -h);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
}

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

export function buildClock(m: Materials) {
  const root = new THREE.Group();
  root.position.set(CLOCK.x, 0, CLOCK.z);
  const body = new THREE.Group(); // tremble pendant la sonnerie
  root.add(body);

  const shell = new THREE.Mesh(new RoundedBoxGeometry(CLOCK.w, CLOCK.h, CLOCK.d, 6, 0.16), m.body);
  shell.position.y = CLOCK.centerY;
  shell.castShadow = shell.receiveShadow = true;
  body.add(shell);

  // Bordure orange en façade.
  const frameShape = roundedRectShape(CLOCK.w - 0.1, CLOCK.h - 0.1, 0.13);
  frameShape.holes.push(roundedRectShape(CLOCK.w - 0.2, CLOCK.h - 0.2, 0.09));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.025, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }), m.orangeEdge);
  frame.position.set(0, CLOCK.centerY, CLOCK.front - 0.012);
  body.add(frame);

  // Écran noir brillant.
  const D = CLOCK.display;
  const panel = new THREE.Mesh(new RoundedBoxGeometry(D.w, D.h, 0.04, 4, 0.05), m.displayPanel);
  panel.position.set(0, D.y, CLOCK.front - 0.005);
  body.add(panel);

  // Chiffres sept segments.
  const digitH = 0.5, digitW = 0.27, thick = 0.058;
  const segV = segmentGeometry(digitH / 2 - 0.02, thick);
  const segH = segmentGeometry(digitW - 0.02, thick);
  const digitsGroup = new THREE.Group();
  digitsGroup.position.set(0, D.y - 0.05, CLOCK.front + 0.016);
  digitsGroup.rotation.z = 0; // affichage droit
  body.add(digitsGroup);
  const slant = 0.06; // légère italique, comme les vrais afficheurs
  const digitMeshes: THREE.Mesh[][] = [];
  const xs = [-0.69, -0.34, 0.16, 0.51];
  for (const x of xs) {
    const segs: THREE.Mesh[] = [];
    const place = (geo: THREE.BufferGeometry, px: number, py: number, rot: number) => {
      const mesh = new THREE.Mesh(geo, m.segOff);
      mesh.position.set(x + px + py * slant, py, 0);
      mesh.rotation.z = rot;
      digitsGroup.add(mesh);
      segs.push(mesh);
    };
    const hw = digitW / 2, hh = digitH / 2, q = digitH / 4;
    place(segH, 0, hh, 0); // a
    place(segV, hw, q, Math.PI / 2 - slant); // b
    place(segV, hw, -q, Math.PI / 2 - slant); // c
    place(segH, 0, -hh, 0); // d
    place(segV, -hw, -q, Math.PI / 2 - slant); // e
    place(segV, -hw, q, Math.PI / 2 - slant); // f
    place(segH, 0, 0, 0); // g
    digitMeshes.push(segs);
  }
  const colon: THREE.Mesh[] = [];
  for (const y of [0.1, -0.1]) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), m.segOn);
    dot.position.set(-0.09 + y * slant, y, 0.012);
    digitsGroup.add(dot);
    colon.push(dot);
  }

  // Indication au-dessus des chiffres (ALARME / SNOOZE / BONJOUR).
  const label = textTexture('', { w: 512, h: 96, font: '600 60px "Helvetica Neue", Arial, sans-serif', color: '#ffb066', glow: '#ff6a00', letter: 10 });
  const labelMat = new THREE.MeshBasicMaterial({ map: label.texture, transparent: true, toneMapped: false, depthWrite: false });
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.135), labelMat);
  labelMesh.position.set(0, D.y + 0.32, CLOCK.front + 0.02);
  body.add(labelMesh);

  // Vitre légèrement réfléchissante.
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(D.w - 0.04, D.h - 0.04), m.glass);
  glass.position.set(0, D.y, CLOCK.front + 0.035);
  body.add(glass);

  // Bouton SNOOZE.
  const B = CLOCK.button;
  const slot = new THREE.Mesh(new RoundedBoxGeometry(B.w + 0.08, 0.04, B.d + 0.08, 3, 0.02), m.darkMetal);
  slot.position.set(0, CLOCK.top + 0.005, 0);
  body.add(slot);
  const button = new THREE.Group();
  button.position.set(0, CLOCK.top, 0);
  body.add(button);
  const cap = new THREE.Mesh(new RoundedBoxGeometry(B.w, B.h, B.d, 4, 0.045), m.darkMetal);
  cap.position.y = B.h / 2;
  cap.castShadow = true;
  button.add(cap);
  const rim = new THREE.Mesh(new RoundedBoxGeometry(B.w + 0.012, 0.02, B.d + 0.012, 2, 0.01), m.orangeEdge);
  rim.position.y = 0.02;
  button.add(rim);
  const snoozeTex = textTexture('SNOOZE', { w: 512, h: 128, font: '700 78px "Helvetica Neue", Arial, sans-serif', color: '#ff8a2a', glow: '#ff6a00', letter: 14 });
  const snooze = new THREE.Mesh(new THREE.PlaneGeometry(B.w * 0.86, B.w * 0.215),
    new THREE.MeshBasicMaterial({ map: snoozeTex.texture, transparent: true, toneMapped: false, depthWrite: false }));
  snooze.rotation.x = -Math.PI / 2;
  snooze.position.y = B.h + 0.002;
  button.add(snooze);

  // Pieds.
  for (const [x, z] of [[-0.9, -0.22], [0.9, -0.22], [-0.9, 0.22], [0.9, 0.22]]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, CLOCK.feet, 20), m.silver);
    foot.position.set(x, CLOCK.feet / 2, z);
    root.add(foot);
  }

  // Grille de haut-parleur sur le dessus (détail).
  for (let i = 0; i < 6; i++) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.24), m.darkMetal);
    slit.position.set(0.62 + i * 0.05, CLOCK.top + 0.001, 0);
    body.add(slit);
  }

  // Poussoir latéral (côté droit).
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 24), m.silver);
  housing.rotation.z = Math.PI / 2;
  housing.position.set(CLOCK.w / 2 + 0.03, CLOCK.plunger.y, 0);
  body.add(housing);
  const plunger = new THREE.Group();
  plunger.position.set(CLOCK.w / 2, CLOCK.plunger.y, 0);
  body.add(plunger);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 16), m.steel);
  rod.rotation.z = Math.PI / 2;
  plunger.add(rod);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12), m.orangeMetal);
  plunger.add(tip);

  // Lumière émise par l'affichage.
  const glowLight = new THREE.PointLight('#ff6a00', 3, 5, 2);
  glowLight.position.set(0, 0.06, CLOCK.front + 1.5); // sous l'axe de l'écran : pas de reflet dans la vitre
  root.add(glowLight);
  const floorGlow = new THREE.PointLight('#ff6a00', 1.5, 3, 2);
  floorGlow.position.set(0, 0.12, CLOCK.front + 0.55);
  root.add(floorGlow);

  return {
    root, body, button, digitMeshes, colon, label, labelMesh, glowLight, floorGlow,
    setPlunger(ext: number) {
      // Tige de longueur ext (+ marge cachée dans le boîtier).
      rod.scale.y = ext + 0.06;
      rod.position.x = (ext - 0.06) / 2;
      tip.position.x = ext;
    },
  };
}
export type Clock = ReturnType<typeof buildClock>;

/** Allume les segments correspondant à « HHMM ». */
export function setDigits(clock: Clock, hhmm: string, m: Materials) {
  hhmm.split('').forEach((ch, i) => {
    const on = DIGITS[ch];
    clock.digitMeshes[i].forEach((mesh, s) => { mesh.material = on[s] ? m.segOn : m.segOff; });
  });
}
