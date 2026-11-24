import * as THREE from 'three';

const standard = (parameters: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial(parameters);

/** Shared materials keep draw-call state changes low across the laboratory. */
export const glassMaterial = new THREE.MeshStandardMaterial({
  color: '#d8f4ef',
  emissive: '#0e2b27',
  emissiveIntensity: 0.5,
  transparent: true,
  opacity: 0.28,
  roughness: 0.05,
  metalness: 0.1,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export const glassNeckMaterial = new THREE.MeshStandardMaterial({
  color: '#e8fbf7',
  emissive: '#123833',
  emissiveIntensity: 0.4,
  transparent: true,
  opacity: 0.34,
  roughness: 0.1,
  metalness: 0.05,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export const metalMaterial = standard({
  color: '#b6c5c2',
  metalness: 0.82,
  roughness: 0.28,
});

export const darkMetalMaterial = standard({
  color: '#364b48',
  metalness: 0.7,
  roughness: 0.42,
});

export const blackRubberMaterial = standard({
  color: '#101b19',
  roughness: 0.92,
  metalness: 0.05,
});

export const benchTopMaterial = standard({
  color: '#8b5d3d',
  roughness: 0.55,
  metalness: 0.03,
});

export const benchEdgeMaterial = standard({
  color: '#4b2d1c',
  roughness: 0.7,
});

export const benchFrameMaterial = standard({
  color: '#1b2c29',
  metalness: 0.55,
  roughness: 0.45,
});

export const wallMaterial = standard({
  color: '#143531',
  roughness: 0.9,
  metalness: 0.02,
});

export const floorMaterial = standard({
  color: '#142824',
  roughness: 0.86,
  metalness: 0.08,
});

export const plasticWhiteMaterial = standard({
  color: '#d9ebe5',
  roughness: 0.32,
  metalness: 0.02,
});

export const plasticTealMaterial = standard({
  color: '#2f7c72',
  roughness: 0.42,
  metalness: 0.03,
});

export const amberGlassMaterial = new THREE.MeshStandardMaterial({
  color: '#8a4f1f',
  transparent: true,
  opacity: 0.72,
  roughness: 0.16,
  metalness: 0.08,
  depthWrite: false,
});

export const amberLiquidMaterial = new THREE.MeshStandardMaterial({
  color: '#d68a33',
  transparent: true,
  opacity: 0.82,
  roughness: 0.2,
  metalness: 0.02,
  depthWrite: false,
});

export const redMaterial = standard({
  color: '#b62c2c',
  roughness: 0.4,
  metalness: 0.15,
});

export const brassMaterial = standard({
  color: '#c99d4f',
  metalness: 0.75,
  roughness: 0.3,
});

export const labelMaterial = standard({
  color: '#f6f1e4',
  roughness: 0.86,
  metalness: 0,
});

export const stopcockMaterial = standard({
  color: '#e9f2ef',
  roughness: 0.35,
  metalness: 0.1,
});

export const glowMaterial = new THREE.MeshBasicMaterial({
  color: '#74b9ae',
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});
