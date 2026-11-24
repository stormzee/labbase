import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { analyseSolution } from '../../domain/chemistry';
import { FLASK_VISUAL_CAPACITY_ML } from '../../domain/constants';
import { useLabStore } from '../../store/labStore';
import { glassMaterial, glassNeckMaterial } from '../materials';
import { HitBox } from './SelectionMarker';

const FLASK_PROFILE: Array<[number, number]> = [
  [0, 0],
  [0.074, 0],
  [0.075, 0.006],
  [0.071, 0.018],
  [0.061, 0.038],
  [0.047, 0.062],
  [0.033, 0.084],
  [0.025, 0.099],
  [0.022, 0.112],
  [0.022, 0.148],
  [0.0255, 0.154],
  [0.0255, 0.159],
  [0.0225, 0.162],
];

const radiusAt = (y: number): number => {
  for (let index = 1; index < FLASK_PROFILE.length; index += 1) {
    const [r0, y0] = FLASK_PROFILE[index - 1];
    const [r1, y1] = FLASK_PROFILE[index];
    if (y <= y1) {
      const t = (y - y0) / Math.max(1e-6, y1 - y0);
      return r0 + (r1 - r0) * Math.min(1, Math.max(0, t));
    }
  }
  return 0;
};

function createFlaskGeometry(): THREE.BufferGeometry {
  const points = FLASK_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y));
  return new THREE.LatheGeometry(points, 40);
}

function createLiquidGeometry(height: number): THREE.BufferGeometry | null {
  if (height <= 0.0008) return null;
  const points: THREE.Vector2[] = [new THREE.Vector2(0, 0.001)];
  const steps = 10;
  for (let step = 0; step <= steps; step += 1) {
    const y = 0.001 + (height - 0.001) * (step / steps);
    const radius = Math.max(0, radiusAt(y) - 0.0028);
    points.push(new THREE.Vector2(radius, y));
  }
  points.push(new THREE.Vector2(0, height));
  return new THREE.LatheGeometry(points, 40);
}

export function Flask() {
  const flask = useLabStore((state) => state.containers.flask);
  const analysis = useMemo(() => analyseSolution(flask), [flask]);
  const glass = useMemo(() => createFlaskGeometry(), []);
  const fillHeight = Math.min(1, flask.volumeMl / FLASK_VISUAL_CAPACITY_ML) * 0.1;
  const quantizedHeight = Math.round(fillHeight * 2000) / 2000;
  const liquid = useMemo(() => createLiquidGeometry(quantizedHeight), [quantizedHeight]);

  useEffect(() => () => glass.dispose(), [glass]);
  useEffect(() => () => liquid?.dispose(), [liquid]);

  return (
    <group>
      <mesh geometry={glass} renderOrder={4} castShadow={false}>
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      {/* neck highlight / lip */}
      <mesh position={[0, 0.16, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.027, 0.024, 0.008, 20, 1, true]} />
        <primitive object={glassNeckMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} renderOrder={4}>
        <ringGeometry args={[0.0725, 0.0755, 32]} />
        <meshBasicMaterial color="#a9d8d0" transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.164, 0]} rotation-x={-Math.PI / 2} renderOrder={4}>
        <ringGeometry args={[0.0225, 0.027, 28]} />
        <meshBasicMaterial color="#d8efe9" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {liquid && (
        <mesh geometry={liquid} renderOrder={3}>
          <meshStandardMaterial
            color={analysis.indicator.color}
            transparent
            opacity={analysis.indicator.opacity}
            roughness={0.16}
            metalness={0.02}
            depthWrite={false}
          />
        </mesh>
      )}
      {quantizedHeight > 0.001 && (
        <mesh position={[0, quantizedHeight, 0]} rotation-x={-Math.PI / 2} renderOrder={3}>
          <circleGeometry args={[Math.max(0.004, radiusAt(quantizedHeight) - 0.003), 24]} />
          <meshStandardMaterial
            color={analysis.indicator.color}
            transparent
            opacity={Math.min(1, analysis.indicator.opacity + 0.1)}
            depthWrite={false}
          />
        </mesh>
      )}
      <HitBox size={[0.15, 0.12, 0.15]} position={[0, 0.06, 0]} partId="body" />
      <HitBox size={[0.06, 0.07, 0.06]} position={[0, 0.14, 0]} partId="neck" />
    </group>
  );
}
