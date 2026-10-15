// Matériaux physiquement plausibles + textures procédurales (canvas). Aucun fichier externe.
import * as THREE from 'three';

export const PALETTE = {
  night: new THREE.Color('#08090D'),
  anthracite: new THREE.Color('#17191F'),
  orange: new THREE.Color('#FF6A00'),
  amber: new THREE.Color('#FFAA26'),
  warmWhite: new THREE.Color('#FFF0D0'),
  dawnOrange: new THREE.Color('#E8650F'),
  cream: new THREE.Color('#F3E2C2'),
};

export function createMaterials() {
  return {
    body: new THREE.MeshPhysicalMaterial({ color: '#1a1c22', metalness: 0.55, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#16181d', metalness: 0.85, roughness: 0.34 }),
    silver: new THREE.MeshStandardMaterial({ color: '#c6c9cf', metalness: 1, roughness: 0.22 }),
    steel: new THREE.MeshStandardMaterial({ color: '#7d828b', metalness: 1, roughness: 0.3 }),
    orangeMetal: new THREE.MeshStandardMaterial({ color: '#ff6a00', metalness: 0.7, roughness: 0.28, emissive: '#ff5a00', emissiveIntensity: 0.55 }),
    orangeEdge: new THREE.MeshStandardMaterial({ color: '#ff7a14', metalness: 0.3, roughness: 0.3, emissive: '#ff5a00', emissiveIntensity: 0.9 }),
    displayPanel: new THREE.MeshPhysicalMaterial({ color: '#050506', metalness: 0.2, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.35 }),
    segOn: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a00').multiplyScalar(2.2) }),
    segOff: new THREE.MeshPhysicalMaterial({ color: '#0b0605', metalness: 0.2, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1, emissive: '#ff5a00', emissiveIntensity: 0.025, envMapIntensity: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.06, transparent: true, opacity: 0.06, clearcoat: 1,
      clearcoatRoughness: 0.02, depthWrite: false,
    }),
    dominoPanel: new THREE.MeshStandardMaterial({ color: '#121418', metalness: 0.6, roughness: 0.42 }),
    sphere: new THREE.MeshPhysicalMaterial({
      color: '#fff0d0', metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
      emissive: '#ffcf8a', emissiveIntensity: 0.06,
    }),
    ballGlow: new THREE.MeshStandardMaterial({ color: '#ffb35c', emissive: '#ff6a00', emissiveIntensity: 5, roughness: 0.3 }),
    beadGlow: new THREE.MeshStandardMaterial({ color: '#ffd28a', emissive: '#ffaa26', emissiveIntensity: 4.5, roughness: 0.3 }),
    string: new THREE.MeshStandardMaterial({ color: '#d9d4c8', metalness: 0.4, roughness: 0.5 }),
  };
}
export type Materials = ReturnType<typeof createMaterials>;

/** Texture de texte (chiffres des dominos, SNOOZE, indications de l'affichage). */
export function textTexture(text: string, opts: {
  w?: number; h?: number; font?: string; color?: string; glow?: string; align?: CanvasTextAlign; letter?: number;
} = {}) {
  const { w = 256, h = 256, font = '700 180px "Helvetica Neue", Arial, sans-serif', color = '#fff0d0', glow, align = 'center', letter = 0 } = opts;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = (t: string) => {
    g.clearRect(0, 0, w, h);
    g.font = font;
    g.textAlign = align;
    g.textBaseline = 'middle';
    (g as unknown as { letterSpacing: string }).letterSpacing = `${letter}px`;
    if (glow) {
      g.shadowColor = glow;
      g.shadowBlur = h * 0.12;
    }
    g.fillStyle = color;
    g.fillText(t, align === 'left' ? 4 : align === 'right' ? w - 4 : w / 2, h / 2 + h * 0.03);
    tex.needsUpdate = true;
  };
  draw(text);
  return { texture: tex, draw };
}

/** Disque solaire : dégradé radial doux (cœur blanc chaud, bord orange). */
export function sunTexture() {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,246,225,1)');
  grd.addColorStop(0.55, 'rgba(255,190,90,1)');
  grd.addColorStop(0.82, 'rgba(255,120,20,1)');
  grd.addColorStop(0.9, 'rgba(255,106,0,0.85)');
  grd.addColorStop(1, 'rgba(255,106,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Halo additif autour des sources lumineuses. */
export function haloTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
