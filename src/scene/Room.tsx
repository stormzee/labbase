import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { boardTexture } from './textures';
import {
  floorMaterial,
  labelMaterial,
  metalMaterial,
  plasticTealMaterial,
  redMaterial,
  wallMaterial,
} from './materials';

function ShelfBottles() {
  const bottles = useMemo(
    () => [
      { x: -0.92, h: 0.1, color: '#3c7f74' },
      { x: -0.78, h: 0.13, color: '#8a4f1f' },
      { x: -0.62, h: 0.08, color: '#d0a14a' },
      { x: 0.72, h: 0.12, color: '#2f7c72' },
      { x: 0.88, h: 0.09, color: '#7a3f52' },
      { x: 1.02, h: 0.11, color: '#3f6f9a' },
    ],
    [],
  );
  return (
    <group position={[0, 1.56, -1.78]}>
      {bottles.map((bottle) => (
        <group key={`${bottle.x}-${bottle.h}`} position={[bottle.x, 0, 0]}>
          <mesh castShadow position={[0, bottle.h / 2 + 0.02, 0]}>
            <cylinderGeometry args={[0.028, 0.032, bottle.h, 12]} />
            <meshStandardMaterial color={bottle.color} roughness={0.35} metalness={0.1} />
          </mesh>
          <mesh position={[0, bottle.h + 0.04, 0]}>
            <cylinderGeometry args={[0.012, 0.016, 0.025, 10]} />
            <meshStandardMaterial color="#d8e7e2" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Whiteboard() {
  const texture = useMemo(() => boardTexture(), []);
  return (
    <group position={[1.22, 1.82, -1.9]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.34, 0.7, 0.035]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.26, 0.63]} />
        <meshStandardMaterial map={texture} roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.39, 0.05]}>
        <boxGeometry args={[0.9, 0.035, 0.06]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function Window() {
  return (
    <group position={[-1.78, 1.82, -1.9]}>
      <mesh>
        <boxGeometry args={[1.02, 0.86, 0.06]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[0.92, 0.76]} />
        <meshStandardMaterial color="#0b2b37" emissive="#1b5d70" emissiveIntensity={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.025, 0.78, 0.02]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.94, 0.025, 0.02]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function SafetyStation() {
  return (
    <group position={[2.45, 1.35, -1.88]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.56, 0.1]} />
        <meshStandardMaterial color="#d7e4de" roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.02, 0.06]}>
        <boxGeometry args={[0.2, 0.055, 0.02]} />
        <primitive object={redMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.02, 0.06]}>
        <boxGeometry args={[0.055, 0.2, 0.02]} />
        <primitive object={redMaterial} attach="material" />
      </mesh>
      <mesh position={[0.22, 0.95, -0.02]}>
        <planeGeometry args={[0.26, 0.18]} />
        <meshStandardMaterial color="#1d7a4a" roughness={0.7} />
      </mesh>
      <mesh position={[0.22, 0.95, 0]}>
        <boxGeometry args={[0.15, 0.03, 0.02]} />
        <meshBasicMaterial color="#eafff4" />
      </mesh>
      <mesh position={[0.22, 0.95, 0]}>
        <boxGeometry args={[0.03, 0.15, 0.02]} />
        <meshBasicMaterial color="#eafff4" />
      </mesh>
    </group>
  );
}

function FireExtinguisher() {
  return (
    <group position={[2.55, 0.45, -1.5]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.42, 14]} />
        <primitive object={redMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.06, 10]} />
        <meshStandardMaterial color="#202a28" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0.02, 0.29, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.035, 0.12, 0.03]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
    </group>
  );
}

export function Room() {
  const showGrid = useSettingsStore((state) => state.showGrid);
  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>
      {showGrid && <gridHelper args={[8, 32, '#22423b', '#152824']} position={[0, 0.002, 0]} />}

      <mesh receiveShadow position={[0, 1.6, -2.02]}>
        <boxGeometry args={[6.4, 3.2, 0.08]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-3.2, 1.6, 0.6]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[5.4, 3.2, 0.08]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[3.2, 1.6, 0.6]} rotation-y={-Math.PI / 2}>
        <boxGeometry args={[5.4, 3.2, 0.08]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      {/* wall panel joints */}
      {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => (
        <mesh key={x} position={[x, 1.55, -1.975]}>
          <boxGeometry args={[0.012, 2.7, 0.012]} />
          <meshStandardMaterial color="#183632" roughness={0.9} />
        </mesh>
      ))}

      <mesh receiveShadow castShadow position={[0, 1.52, -1.84]}>
        <boxGeometry args={[2.3, 0.035, 0.2]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      <ShelfBottles />
      <Whiteboard />
      <Window />
      <SafetyStation />
      <FireExtinguisher />

      {/* hanging strip lights */}
      {[-0.9, 0.9].map((x) => (
        <group key={x} position={[x, 2.72, 0.15]}>
          <mesh>
            <boxGeometry args={[0.95, 0.035, 0.18]} />
            <meshStandardMaterial color="#142824" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[0.88, 0.012, 0.12]} />
            <meshStandardMaterial color="#fff4d8" emissive="#ffe9b8" emissiveIntensity={1.8} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.012, 1, 0.012]} />
            <primitive object={metalMaterial} attach="material" />
          </mesh>
        </group>
      ))}

      {/* bench-side stool, out of the way */}
      <group position={[1.6, 0, 0.65]}>
        <mesh castShadow position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 18]} />
          <primitive object={plasticTealMaterial} attach="material" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 0.44, 10]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.03, 18]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
      </group>

      {/* wall sign */}
      <mesh position={[-0.4, 2.28, -1.97]}>
        <planeGeometry args={[0.7, 0.16]} />
        <primitive object={labelMaterial} attach="material" />
      </mesh>
    </group>
  );
}
