// Sol réfléchissant, brume, fond, lumières et soleil : tout ce qui fait passer de la nuit au matin.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SUN, CLOCK } from '../anim/layout';
import { PALETTE, sunTexture, haloTexture } from './materials';
import { lerp } from '../anim/math';

export function buildEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer, quality: { reflectionScale: number }) {
  // Reflets d'environnement doux pour les métaux.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.background = PALETTE.night.clone();
  scene.fog = new THREE.FogExp2(PALETTE.night.clone(), 0.045);

  // Sol : miroir (Reflector) recouvert d'un vernis sombre semi-transparent qui reçoit les ombres.
  const size = 80;
  const mirror = new Reflector(new THREE.PlaneGeometry(size, size), {
    textureWidth: Math.round(1920 * quality.reflectionScale),
    textureHeight: Math.round(1080 * quality.reflectionScale),
    color: new THREE.Color('#8a8a92'),
    clipBias: 0.003,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = -0.0005;
  scene.add(mirror);

  const floorMat = new THREE.MeshStandardMaterial({
    color: '#0b0c10', roughness: 0.8, metalness: 0.0, transparent: true, opacity: 0.74,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Soleil : disque dégradé + grand halo additif.
  const sun = new THREE.Group();
  sun.position.set(SUN.x, SUN.yStart, SUN.z);
  scene.add(sun);
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTexture(), transparent: true, toneMapped: false, depthWrite: false, fog: false });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(SUN.r * 2, SUN.r * 2), sunMat);
  sun.add(disc);
  const haloMat = new THREE.MeshBasicMaterial({
    map: haloTexture(), color: '#ff8a2a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(SUN.r * 7, SUN.r * 7), haloMat);
  halo.position.z = -0.1;
  sun.add(halo);

  // ── Lumières ──
  const hemi = new THREE.HemisphereLight('#2a2f3a', '#050506', 0.35);
  scene.add(hemi);

  const key = new THREE.SpotLight('#cdd6ff', 260, 26, THREE.MathUtils.degToRad(32), 0.65, 2);
  key.position.set(3.5, 9, 6.5);
  key.target.position.set(-1.2, 0.6, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  key.shadow.camera.near = 4;
  key.shadow.camera.far = 22;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight('#9aa3cc', 0.5);
  rim.position.set(-4, 5, -8);
  scene.add(rim);

  // Lumière du soleil : rasante, depuis l'arrière, ombres longues vers la caméra.
  const sunLight = new THREE.DirectionalLight('#ffb067', 0);
  sunLight.position.set(0, 3, SUN.z);
  sunLight.target.position.set(0, 0.6, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera as THREE.OrthographicCamera;
  sc.left = -9; sc.right = 9; sc.top = 6; sc.bottom = -3; sc.near = 1; sc.far = 30;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.03;
  sunLight.shadow.radius = 5;
  scene.add(sunLight, sunLight.target);

  // Lumière d'ambiance chaude du matin, devant la scène.
  const fill = new THREE.PointLight('#ffd6a0', 0, 30, 1.2);
  fill.position.set(0, 6, 9);
  scene.add(fill);

  const night = PALETTE.night, orange = PALETTE.dawnOrange, cream = PALETTE.cream;
  const tmp = new THREE.Color();
  const sky = (k: number, out: THREE.Color) => {
    if (k < 0.55) return out.copy(night).lerp(orange, k / 0.55);
    return out.copy(orange).lerp(cream, (k - 0.55) / 0.45);
  };

  return {
    mirror, floor, sun, key, sunLight, fill,
    /** k = 0 (nuit) → 1 (plein matin). */
    update(k: number) {
      sky(k, tmp);
      (scene.background as THREE.Color).copy(tmp);
      const fog = scene.fog as THREE.FogExp2;
      fog.color.copy(tmp);
      fog.density = lerp(0.045, 0.022, k);
      scene.environmentIntensity = lerp(0.18, 0.75, k);

      sun.position.y = lerp(SUN.yStart, SUN.yEnd, k);
      sun.visible = k > 0.001;
      sunMat.opacity = Math.min(1, k * 3);
      haloMat.opacity = Math.min(0.85, k * 1.4);
      sunMat.color.setRGB(1, lerp(0.85, 1, k), lerp(0.7, 1, k));

      hemi.color.set('#2a2f3a').lerp(new THREE.Color('#ffe2b8'), k);
      hemi.groundColor.set('#050506').lerp(new THREE.Color('#7a4a24'), k);
      hemi.intensity = lerp(0.35, 1.5, k);
      key.color.set('#cdd6ff').lerp(new THREE.Color('#ffe0b0'), k);
      key.intensity = lerp(260, 180, k);
      rim.intensity = lerp(0.55, 0.0, k);
      sunLight.intensity = lerp(0, 4.2, k);
      sunLight.position.set(0, Math.max(0.4, sun.position.y + 0.6), SUN.z);
      fill.intensity = lerp(0, 55, k * k);

      // Le vernis du sol se réchauffe et s'éclaircit, les reflets restent visibles.
      floorMat.color.set('#0b0c10').lerp(new THREE.Color('#6b4426'), k * 0.85);
      floorMat.opacity = lerp(0.74, 0.6, k);
    },
    clockFocus: new THREE.Vector3(0, CLOCK.display.y, CLOCK.front),
  };
}
export type Environment = ReturnType<typeof buildEnvironment>;
