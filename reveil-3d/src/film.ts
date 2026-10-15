// Le film : moteur de rendu, scène, post-traitement. Construit une fois, puis rendu à n'importe quel instant.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createMaterials } from './scene/materials';
import { buildEnvironment } from './scene/environment';
import { buildClock } from './objects/clock';
import { buildDominoes, buildSeesaw, buildGlowBall, buildRamp } from './objects/chain';
import { buildCradle } from './objects/cradle';
import { buildWheel, buildArm } from './objects/wheel';
import { BALL_R, PUSHER } from './anim/layout';
import { updateScene } from './anim/apply';
import { CameraRig } from './camera/shots';

export interface Quality { pixelRatio: number; reflectionScale: number; dof: boolean; samples: number }
export const QUALITY_PREVIEW: Quality = { pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5), reflectionScale: 0.5, dof: true, samples: 4 };

function buildMachine(scene: THREE.Scene, renderer: THREE.WebGLRenderer, q: Quality) {
  const materials = createMaterials();
  const env = buildEnvironment(scene, renderer, q);
  const clock = buildClock(materials);
  const dominoes = buildDominoes(materials);
  const seesaw = buildSeesaw(materials);
  const ball = buildGlowBall(materials.ballGlow, BALL_R, '#ff6a00', 2.2);
  const ramp = buildRamp(materials);
  const cradle = buildCradle(materials);
  const wheel = buildWheel(materials);
  const bead = buildGlowBall(materials.beadGlow, BALL_R * 0.9, '#ffaa26', 1.8);
  const arm = buildArm(materials);
  scene.add(clock.root, dominoes.group, seesaw.group, ball.group, ramp.group, cradle.group, wheel.group, bead.group, arm.group);
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== env.floor && o !== (env.mirror as unknown as THREE.Object3D)) {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.Material;
      if (!mat.transparent) { mesh.castShadow = true; mesh.receiveShadow = true; }
    }
  });
  return { materials, env, clock, dominoes, seesaw, ball, ramp, cradle, wheel, bead, arm, pusherX0: PUSHER.xLeft, state: { label: '' } };
}
export type Machine = ReturnType<typeof buildMachine>;

export class Film {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 120);
  readonly machine: Machine;
  private composer: EffectComposer;
  private bokeh: BokehPass;
  private bloom: UnrealBloomPass;
  private rig = new CameraRig();
  private width = 1920;
  private height = 1080;

  constructor(canvas: HTMLCanvasElement, private quality: Quality = QUALITY_PREVIEW) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(quality.pixelRatio);

    this.machine = buildMachine(this.scene, this.renderer, quality);

    const rt = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.HalfFloatType, samples: quality.samples });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 3, aperture: 0.0016, maxblur: 0.0045 });
    this.bokeh.enabled = quality.dof;
    this.composer.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 0.6, 0.45, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.setSize(this.width, this.height);
  }

  setSize(w: number, h: number, pixelRatio = this.quality.pixelRatio) {
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Place la scène à l'instant t (secondes) et la rend. */
  renderAt(t: number) {
    const k = updateScene(this.machine, t);
    const focusDist = this.rig.apply(this.camera, t);
    (this.bokeh.uniforms as Record<string, THREE.IUniform>)['focus'].value = focusDist;
    // Au matin, la profondeur de champ s'adoucit et la lueur s'élargit.
    (this.bokeh.uniforms as Record<string, THREE.IUniform>)['aperture'].value = 0.0016 * (1 - 0.4 * k);
    this.bloom.strength = 0.6 + 0.1 * k;
    this.bloom.threshold = 1.0 + 0.35 * k;
    this.renderer.toneMappingExposure = 1.0 - 0.06 * k;
    this.composer.render();
  }
}
