import { useMemo } from 'react';
import { useLabStore } from '../../store/labStore';
import { labelTexture } from '../textures';
import { glassMaterial, glassNeckMaterial, metalMaterial, plasticWhiteMaterial, redMaterial } from '../materials';
import { HitBox } from './SelectionMarker';

export function Pipette() {
  const selected = useLabStore((state) => state.interaction.selectedId === 'pipette');
  const label = useMemo(
    () => labelTexture({ title: '25', subtitle: 'mL · volumetric', accent: '#2c6f67', width: 256, height: 160 }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.0042, 0.0042, 0.12, 10]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.135, 0]}>
        <cylinderGeometry args={[0.007, 0.0042, 0.03, 12]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.175, 0]} scale={[1, 1.8, 1]}>
        <sphereGeometry args={[0.014, 18, 12]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.215, 0]}>
        <cylinderGeometry args={[0.0042, 0.007, 0.03, 12]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.0042, 0.0042, 0.24, 10]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.465, 0]}>
        <cylinderGeometry args={[0.006, 0.0045, 0.008, 10]} />
        <primitive object={glassNeckMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.0052, 0.0052, 0.006, 10]} />
        <primitive object={redMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.0025, 0.0016, 0.012, 8]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.19, 0.0145]}>
        <planeGeometry args={[0.034, 0.021]} />
        <meshBasicMaterial map={label} transparent opacity={selected ? 1 : 0.78} depthWrite={false} side={2} />
      </mesh>
      <HitBox size={[0.05, 0.47, 0.05]} position={[0, 0.235, 0]} partId="bulb" />
      <HitBox size={[0.025, 0.06, 0.025]} position={[0, 0.4, 0]} partId="mark" />
      {selected && (
        <mesh position={[0, 0.19, 0]}>
          <sphereGeometry args={[0.02, 12, 10]} />
          <meshBasicMaterial color="#f2b84b" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function PipetteRack() {
  return (
    <group position={[-0.18, 0.8, -0.29]}>
      <mesh castShadow receiveShadow position={[0, 0.006, 0]}>
        <boxGeometry args={[0.46, 0.012, 0.11]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.055, 0]}>
            <boxGeometry args={[0.012, 0.11, 0.05]} />
            <primitive object={metalMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 0.108, 0]}>
            <boxGeometry args={[0.03, 0.008, 0.055]} />
            <primitive object={plasticWhiteMaterial} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.006, 0.07]}>
        <boxGeometry args={[0.3, 0.012, 0.03]} />
        <primitive object={plasticWhiteMaterial} attach="material" />
      </mesh>
    </group>
  );
}

export function SafetyGoggles() {
  return (
    <group position={[0.1, 0.812, -0.32]} rotation-y={-0.35}>
      {[-0.028, 0.028].map((x) => (
        <mesh key={x} position={[x, 0.012, 0]} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[0.02, 0.006, 8, 20]} />
          <meshStandardMaterial color="#7fd6d0" transparent opacity={0.55} roughness={0.15} metalness={0.15} />
        </mesh>
      ))}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.02, 0.006, 0.008]} />
        <meshStandardMaterial color="#3c6f69" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.012, -0.024]}>
        <boxGeometry args={[0.1, 0.004, 0.006]} />
        <meshStandardMaterial color="#2f4b46" roughness={0.7} />
      </mesh>
    </group>
  );
}
