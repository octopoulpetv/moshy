import * as THREE from 'three';
import type { V3 } from '../anim/math';

export const vec = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

const UP = new THREE.Vector3(0, 1, 0);
/** Cylindre (tige, fil) tendu entre deux points. */
export function rodBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat);
  placeRod(mesh, a, b);
  mesh.castShadow = true;
  return mesh;
}
export function placeRod(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = new THREE.Vector3().subVectors(b, a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, Math.max(d.length(), 1e-4), 1);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
}

/** Tube lisse le long d'une liste de points. */
export function tube(points: V3[], r: number, mat: THREE.Material, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map(vec), false, 'centripetal');
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 3), r, radial, false), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Deux rails parallèles sous la trajectoire d'une bille (rayon br) + supports jusqu'au sol.
 */
export function railPair(path: V3[], br: number, mat: THREE.Material, supportMat: THREE.Material, gap = 0.055, supportEvery = 0.45) {
  const group = new THREE.Group();
  const drop = Math.sqrt(Math.max(br * br - gap * gap, 0));
  const left: V3[] = [], right: V3[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const t = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
    const side = new THREE.Vector3(-t.z, 0, t.x); // horizontal, perpendiculaire
    const p = path[i];
    left.push([p[0] + side.x * gap, p[1] - drop, p[2] + side.z * gap]);
    right.push([p[0] - side.x * gap, p[1] - drop, p[2] - side.z * gap]);
  }
  group.add(tube(left, 0.012, mat), tube(right, 0.012, mat));
  // Traverses et supports verticaux.
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
    if (acc < supportEvery && i !== path.length - 1) continue;
    acc = 0;
    const l = vec(left[i]), r = vec(right[i]);
    group.add(rodBetween(l, r, 0.008, supportMat, 6));
    const mid = l.clone().add(r).multiplyScalar(0.5);
    mid.y -= 0.01;
    group.add(rodBetween(mid, new THREE.Vector3(mid.x, 0, mid.z), 0.01, supportMat, 8));
  }
  return group;
}
