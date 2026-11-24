import { useMemo } from 'react';
import * as THREE from 'three';
import { labelTexture } from '../textures';
import { glassMaterial, glassNeckMaterial, plasticTealMaterial, plasticWhiteMaterial } from '../materials';
import { HitBox } from './SelectionMarker';

export function Beaker() {
  return (
    <group>
      <mesh position={[0, 0.058, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.048, 0.045, 0.112, 28, 1, true]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.003, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.045, 0.045, 0.006, 28]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.114, 0]} rotation-x={Math.PI / 2} renderOrder={4}>
        <torusGeometry args={[0.048, 0.002, 6, 28]} />
        <primitive object={glassNeckMaterial} attach="material" />
      </mesh>
      {[0.03, 0.055, 0.08, 0.105].map((y, index) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.046 - (index === 3 ? 0.001 : 0), 0.0007, 4, 24]} />
          <meshBasicMaterial color="#e8fbf7" transparent opacity={0.6} />
        </mesh>
      ))}
      <HitBox size={[0.11, 0.12, 0.11]} position={[0, 0.06, 0]} partId="body" />
    </group>
  );
}

export function MeasuringCylinder() {
  return (
    <group>
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.042, 0.045, 0.024, 6]} />
        <primitive object={plasticWhiteMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.148, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.026, 0.026, 0.24, 22, 1, true]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.268, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.029, 0.026, 0.012, 22, 1, true]} />
        <primitive object={glassNeckMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.024, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.026, 0.026, 0.006, 22]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      {[0.06, 0.1, 0.14, 0.18, 0.22, 0.26].map((y, index) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.0258, 0.0006, 4, 22]} />
          <meshBasicMaterial color="#e8fbf7" transparent opacity={index % 2 === 0 ? 0.75 : 0.45} />
        </mesh>
      ))}
      <HitBox size={[0.06, 0.28, 0.06]} position={[0, 0.15, 0]} partId="body" />
    </group>
  );
}

export function WashBottle() {
  const label = useMemo(
    () =>
      labelTexture({
        title: 'DISTILLED',
        subtitle: 'H₂O · rinse',
        accent: '#2c6f67',
        width: 512,
        height: 300,
      }),
    [],
  );
  const spout = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.19, 0),
      new THREE.Vector3(0.002, 0.23, 0.01),
      new THREE.Vector3(0.03, 0.26, 0.03),
      new THREE.Vector3(0.075, 0.27, 0.07),
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.0055, 8, false);
  }, []);
  return (
    <group>
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.047, 0.05, 0.16, 22]} />
        <primitive object={plasticTealMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.022, 0.047, 0.045, 22]} />
        <primitive object={plasticTealMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.025, 18]} />
        <primitive object={plasticWhiteMaterial} attach="material" />
      </mesh>
      <mesh geometry={spout}>
        <primitive object={plasticWhiteMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.085, 0.0508]}>
        <planeGeometry args={[0.062, 0.036]} />
        <meshBasicMaterial map={label} transparent opacity={0.95} depthWrite={false} side={2} />
      </mesh>
      <HitBox size={[0.11, 0.23, 0.11]} position={[0, 0.1, 0]} partId="spout" />
    </group>
  );
}
