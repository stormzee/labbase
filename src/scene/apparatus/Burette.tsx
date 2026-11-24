import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  BURETTE_CAPACITY_ML,
  BURETTE_TUBE_BOTTOM_M,
  BURETTE_TUBE_HEIGHT_M,
} from '../../domain/constants';
import { useLabStore } from '../../store/labStore';
import { glassMaterial, glassNeckMaterial, metalMaterial, stopcockMaterial } from '../materials';
import { buretteScaleTexture } from '../textures';
import { HitBox, HitSphere } from './SelectionMarker';

const DROP_COUNT = 4;

export function Burette() {
  const volume = useLabStore((state) => state.containers.burette.volumeMl);
  const flow = useLabStore((state) => state.flow);
  const scaleTexture = useMemo(() => buretteScaleTexture(), []);
  const knobRef = useRef<THREE.Group>(null);
  const drops = useRef<Array<THREE.Mesh | null>>([]);
  const liquidHeight = Math.max(0, Math.min(1, volume / BURETTE_CAPACITY_ML)) * BURETTE_TUBE_HEIGHT_M;
  const liquidColor = '#9ed3ff';

  useFrame((state, delta) => {
    if (knobRef.current) {
      if (flow !== 'off') knobRef.current.rotation.z += delta * 4;
    }
    const t = state.clock.elapsedTime;
    for (let index = 0; index < DROP_COUNT; index += 1) {
      const mesh = drops.current[index];
      if (!mesh) continue;
      const phase = (t * 1.9 + index * 0.25) % 1;
      mesh.position.set(0, -phase * 0.1, 0);
      mesh.visible = flow !== 'off' && volume > 0;
      const scale = flow === 'stream' ? 0.55 : 1;
      mesh.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* tip */}
      <mesh position={[0, 0.035, 0]} castShadow={false}>
        <cylinderGeometry args={[0.0065, 0.0028, 0.07, 12]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.085, 0]}>
        <cylinderGeometry args={[0.007, 0.0085, 0.035, 12]} />
        <primitive object={glassNeckMaterial} attach="material" />
      </mesh>

      {/* stopcock barrel and key */}
      <mesh position={[0, 0.1, 0.016]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.017, 0.017, 0.05, 14]} />
        <primitive object={stopcockMaterial} attach="material" />
      </mesh>
      <group ref={knobRef} position={[0, 0.1, 0.048]}>
        <mesh rotation-z={Math.PI / 2}>
          <boxGeometry args={[0.062, 0.012, 0.012]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.009, 0.009, 0.018, 10]} />
          <primitive object={stopcockMaterial} attach="material" />
        </mesh>
      </group>

      {/* graduated tube */}
      <mesh position={[0, BURETTE_TUBE_BOTTOM_M + BURETTE_TUBE_HEIGHT_M / 2, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.014, 0.014, BURETTE_TUBE_HEIGHT_M, 20, 1, true]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, BURETTE_TUBE_BOTTOM_M + BURETTE_TUBE_HEIGHT_M + 0.008, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.018, 0.014, 0.018, 18, 1, true]} />
        <primitive object={glassNeckMaterial} attach="material" />
      </mesh>

      {/* liquid column */}
      {liquidHeight > 0.001 && (
        <group>
          <mesh
            position={[0, BURETTE_TUBE_BOTTOM_M + liquidHeight / 2, 0]}
            renderOrder={3}
          >
            <cylinderGeometry args={[0.0115, 0.0115, liquidHeight, 16]} />
            <meshStandardMaterial
              color={liquidColor}
              transparent
              opacity={0.72}
              roughness={0.12}
              metalness={0.03}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[0, BURETTE_TUBE_BOTTOM_M + liquidHeight, 0]}
            rotation-x={-Math.PI / 2}
            renderOrder={3}
          >
            <circleGeometry args={[0.0115, 16]} />
            <meshStandardMaterial color="#d9f0ff" transparent opacity={0.75} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* printed scale, backed by a dark strip for readability against clear glass */}
      <mesh position={[0, BURETTE_TUBE_BOTTOM_M + BURETTE_TUBE_HEIGHT_M / 2, -0.0141]} renderOrder={2}>
        <planeGeometry args={[0.042, BURETTE_TUBE_HEIGHT_M]} />
        <meshBasicMaterial color="#0b2521" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, BURETTE_TUBE_BOTTOM_M + BURETTE_TUBE_HEIGHT_M / 2, 0.0144]} renderOrder={5}>
        <planeGeometry args={[0.038, BURETTE_TUBE_HEIGHT_M]} />
        <meshBasicMaterial
          map={scaleTexture}
          transparent
          opacity={0.98}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* flowing stream and droplets */}
      <mesh visible={flow !== 'off'} position={[0, -0.055, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.0024, 0.0024, 0.13, 6]} />
        <meshBasicMaterial color="#bfe4ff" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {Array.from({ length: DROP_COUNT }).map((_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            drops.current[index] = mesh;
          }}
          position={[0, 0, 0]}
          renderOrder={2}
        >
          <sphereGeometry args={[0.0036, 8, 6]} />
          <meshBasicMaterial color="#cfeaff" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}

      <HitBox size={[0.065, 0.6, 0.065]} position={[0, 0.42, 0]} partId="tube" />
      <HitSphere radius={0.05} position={[0, 0.1, 0.02]} partId="stopcock" />
      <HitBox size={[0.03, 0.08, 0.03]} position={[0, 0.035, 0]} partId="tip" />
    </group>
  );
}
