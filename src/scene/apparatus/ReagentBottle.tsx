import { useMemo } from 'react';
import { CONTAINER_CAPACITY_ML } from '../../domain/constants';
import type { ApparatusId, ContainerId } from '../../domain/types';
import { useLabStore } from '../../store/labStore';
import { labelTexture } from '../textures';
import {
  amberGlassMaterial,
  amberLiquidMaterial,
  glassMaterial,
  plasticWhiteMaterial,
  redMaterial,
} from '../materials';
import { HitBox } from './SelectionMarker';

interface ReagentBottleProps {
  id: Extract<ApparatusId, 'hclBottle' | 'naohBottle' | 'indicator'>;
  containerId: ContainerId;
  title: string;
  subtitle: string;
  accent: string;
  variant?: 'bottle' | 'dropper';
}

export function ReagentBottle({
  id,
  containerId,
  title,
  subtitle,
  accent,
  variant = 'bottle',
}: ReagentBottleProps) {
  const container = useLabStore((state) => state.containers[containerId]);
  const label = useMemo(
    () =>
      labelTexture({
        title,
        subtitle,
        accent,
        width: variant === 'dropper' ? 384 : 512,
        height: variant === 'dropper' ? 256 : 300,
      }),
    [accent, subtitle, title, variant],
  );

  if (variant === 'dropper') {
    const bodyRadius = 0.021;
    const bodyHeight = 0.065;
    const liquidHeight = Math.min(1, container.volumeMl / CONTAINER_CAPACITY_ML[containerId]) * bodyHeight * 0.8;
    return (
      <group>
        <mesh castShadow position={[0, bodyHeight / 2 + 0.004, 0]}>
          <cylinderGeometry args={[bodyRadius, bodyRadius + 0.002, bodyHeight, 18]} />
          <primitive object={amberGlassMaterial} attach="material" />
        </mesh>
        <mesh position={[0, 0.004 + liquidHeight / 2, 0]}>
          <cylinderGeometry args={[bodyRadius - 0.002, bodyRadius, liquidHeight, 16]} />
          <primitive object={amberLiquidMaterial} attach="material" />
        </mesh>
        <mesh position={[0, bodyHeight + 0.014, 0]}>
          <cylinderGeometry args={[0.009, 0.012, 0.02, 12]} />
          <primitive object={plasticWhiteMaterial} attach="material" />
        </mesh>
        <mesh position={[0, bodyHeight + 0.034, 0]} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.011, 14, 10]} />
          <meshStandardMaterial color="#1f2a28" roughness={0.6} />
        </mesh>
        <mesh position={[0, bodyHeight * 0.55, bodyRadius + 0.001]}>
          <planeGeometry args={[0.03, 0.022]} />
          <meshBasicMaterial map={label} transparent depthWrite={false} side={2} />
        </mesh>
        <HitBox size={[0.055, 0.12, 0.045]} position={[0, 0.06, 0]} partId="dropper" />
      </group>
    );
  }

  const bodyRadius = 0.038;
  const bodyHeight = 0.112;
  const liquidHeight = Math.min(1, container.volumeMl / CONTAINER_CAPACITY_ML[containerId]) * bodyHeight * 0.78;
  const isAmber = id === 'indicator';
  return (
    <group>
      <mesh castShadow position={[0, bodyHeight / 2 + 0.004, 0]} renderOrder={4}>
        <cylinderGeometry args={[bodyRadius, bodyRadius + 0.003, bodyHeight, 20]} />
        <primitive object={isAmber ? amberGlassMaterial : glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.005 + liquidHeight / 2, 0]} renderOrder={3}>
        <cylinderGeometry args={[bodyRadius - 0.0025, bodyRadius + 0.001, liquidHeight, 18]} />
        <meshStandardMaterial
          color={isAmber ? '#d68a33' : '#b7e2f5'}
          transparent
          opacity={0.62}
          roughness={0.25}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, bodyHeight + 0.027, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.016, 0.033, 0.05, 20]} />
        <primitive object={isAmber ? amberGlassMaterial : glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, bodyHeight + 0.058, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.018, 14]} />
        <primitive object={plasticWhiteMaterial} attach="material" />
      </mesh>
      <mesh position={[0, bodyHeight + 0.052, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 0.005, 14]} />
        <primitive object={redMaterial} attach="material" />
      </mesh>
      <mesh position={[0, bodyHeight * 0.52, bodyRadius + 0.0015]}>
        <planeGeometry args={[0.056, 0.04]} />
        <meshBasicMaterial map={label} transparent depthWrite={false} side={2} />
      </mesh>
      <HitBox size={[0.09, 0.19, 0.09]} position={[0, 0.095, 0]} partId="label" />
    </group>
  );
}
