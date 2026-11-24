import * as THREE from 'three';

const labelCache = new Map<string, THREE.CanvasTexture>();

interface LabelSpec {
  title: string;
  subtitle: string;
  accent?: string;
  background?: string;
  width?: number;
  height?: number;
}

/** Procedural reagent labels — no external texture files, crisp at any distance. */
export function labelTexture(spec: LabelSpec): THREE.CanvasTexture {
  const key = JSON.stringify(spec);
  const cached = labelCache.get(key);
  if (cached) return cached;
  const width = spec.width ?? 512;
  const height = spec.height ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const accent = spec.accent ?? '#2c6f67';
  context.fillStyle = spec.background ?? '#f5f0e3';
  context.fillRect(0, 0, width, height);
  context.fillStyle = accent;
  context.fillRect(0, 0, width, 16);
  context.fillRect(0, height - 16, width, 16);
  context.fillStyle = '#12201e';
  context.textAlign = 'center';
  context.font = `700 ${Math.round(height * 0.2)}px "Segoe UI", system-ui, sans-serif`;
  context.fillText(spec.title, width / 2, height * 0.43);
  context.fillStyle = '#3e5551';
  context.font = `500 ${Math.round(height * 0.12)}px "Segoe UI", system-ui, sans-serif`;
  context.fillText(spec.subtitle, width / 2, height * 0.63);
  context.strokeStyle = '#b9b09c';
  context.lineWidth = 3;
  context.strokeRect(8, 8, width - 16, height - 16);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  labelCache.set(key, texture);
  return texture;
}

/** Transparent burette scale: 0 at top, 50 at bottom. */
export function buretteScaleTexture(): THREE.CanvasTexture {
  const key = '@burette-scale';
  const cached = labelCache.get(key);
  if (cached) return cached;
  const width = 192;
  const height = 1536;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  context.clearRect(0, 0, width, height);
  context.strokeStyle = '#e8fbf7';
  context.fillStyle = '#d7f0eb';
  context.font = '600 34px "Cascadia Mono", Consolas, monospace';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (let ml = 0; ml <= 50; ml += 1) {
    const y = 18 + (ml / 50) * (height - 36);
    const major = ml % 5 === 0;
    const length = major ? 48 : 26;
    context.lineWidth = major ? 4 : 2;
    context.beginPath();
    context.moveTo(width - 12, y);
    context.lineTo(width - 12 - length, y);
    context.stroke();
    if (major) context.fillText(String(ml), width - 74, y);
  }
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(232,251,247,0.55)';
  context.beginPath();
  context.moveTo(width - 9, 10);
  context.lineTo(width - 9, height - 10);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  labelCache.set(key, texture);
  return texture;
}

export function boardTexture(): THREE.CanvasTexture {
  const key = '@board';
  const cached = labelCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const gradient = context.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, '#eef7f3');
  gradient.addColorStop(1, '#d9ebe5');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);
  context.fillStyle = '#143d37';
  context.font = '700 62px "Segoe UI", system-ui, sans-serif';
  context.fillText('ACID–BASE TITRATION', 56, 92);
  context.fillStyle = '#2c6f67';
  context.font = '600 40px "Segoe UI", system-ui, sans-serif';
  context.fillText('HCl (unknown) + NaOH (0.1000 M)', 56, 160);
  context.fillStyle = '#24443f';
  context.font = '500 32px "Segoe UI", system-ui, sans-serif';
  context.fillText('HCl + NaOH → NaCl + H₂O', 56, 224);
  context.fillText('n(NaOH) = n(HCl)   ·   1 : 1', 56, 272);
  context.fillStyle = '#b8862b';
  context.font = '600 34px "Cascadia Mono", Consolas, monospace';
  context.fillText('C(HCl) = C(NaOH) × V(titre) ÷ V(aliquot)', 56, 338);
  context.strokeStyle = '#9dbdb5';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(56, 376);
  context.lineTo(968, 376);
  context.stroke();
  context.fillStyle = '#46635e';
  context.font = '500 28px "Segoe UI", system-ui, sans-serif';
  context.fillText('Phenolphthalein · colourless below pH 8.2 · pink endpoint', 56, 430);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  labelCache.set(key, texture);
  return texture;
}
