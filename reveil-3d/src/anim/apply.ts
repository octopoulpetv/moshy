// updateScene(t) : applique l'état calculé par la chorégraphie à tous les objets 3D.
// Aucune mémoire d'une image à l'autre : n'importe quel instant peut être recalculé directement.
import * as THREE from 'three';
import { CLOCK } from './layout';
import { clamp, flash } from './math';
import {
  T, dominoAngles, seesawAngle, plungerExtension, ballPosition, buttonDepth, cradleAngles, lifterTip, pusherOffset,
  wheelAngle, beadPosition, armAngle, triggerFlap, displayMinutes, fmt, displayLabel, displayGlow, clockShake, dawn,
} from './timeline';
import { setDigits } from '../objects/clock';

const SEG_BASE = new THREE.Color('#ff6a00');
import type { Machine } from '../film';

export function updateScene(m: Machine, t: number) {
  const { clock, materials } = m;

  // Réveil
  clock.body.rotation.z = clockShake(t);
  clock.body.position.x = clockShake(t + 0.37) * 0.6;
  setDigits(clock, fmt(displayMinutes(t)), materials);
  const label = displayLabel(t);
  if (label !== m.state.label) {
    clock.label.draw(label);
    m.state.label = label;
  }
  const glow = displayGlow(t);
  const k = dawn(t);
  materials.segOn.color.copy(SEG_BASE).multiplyScalar(2.2 * glow * (1 - 0.2 * k));
  clock.colon.forEach((c) => (c.visible = !(t >= T.alarm && t < T.alarm + 1.5) || Math.floor(t * 4) % 2 === 0));
  clock.glowLight.intensity = 1.6 * glow * (1 - 0.6 * k);
  clock.floorGlow.intensity = 0.55 * glow * (1 - 0.7 * k);
  clock.button.position.y = CLOCK.top - buttonDepth(t);
  clock.setPlunger(plungerExtension(t));

  // Dominos
  dominoAngles(t).forEach((a, i) => (m.dominoes.pivots[i].rotation.z = -a));

  // Bascule
  m.seesaw.arm.rotation.z = seesawAngle(t);

  // Bille orange (lumière renforcée à l'impact sur le bouton)
  m.ball.group.position.set(...ballPosition(t));
  const hit = flash(t - T.snooze1, 4);
  m.ball.light.intensity = m.ball.baseIntensity * (1 + 2.5 * hit) * (1 - 0.5 * k);
  m.ball.halo.material.opacity = 0.55 + 0.4 * hit;

  // Pendule de Newton, tige de levage, poussoir
  cradleAngles(t).forEach((a, i) => (m.cradle.pendulums[i].rotation.z = a));
  m.cradle.setLifter(new THREE.Vector3(...lifterTip(t)));
  m.cradle.pusher.position.x = m.pusherX0 - pusherOffset(t);

  // Roue, bille ambrée
  m.wheel.wheel.rotation.z = wheelAngle(t);
  m.bead.group.position.set(...beadPosition(t));
  const arrive = flash(t - T.beadArrive, 4);
  m.bead.light.intensity = m.bead.baseIntensity * (1 + 1.5 * arrive) * (1 - 0.5 * k);

  // Bras (la tête reste verticale)
  const a = armAngle(t);
  m.arm.arm.rotation.x = a;
  m.arm.head.rotation.x = -a;
  m.arm.flapPivot.rotation.z = -triggerFlap(t);

  // Lever du jour
  m.env.update(k);
  materials.orangeEdge.emissiveIntensity = 0.9 * (1 - 0.4 * k);

  return clamp(k);
}
