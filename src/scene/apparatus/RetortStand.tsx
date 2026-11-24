import {
  darkMetalMaterial,
  metalMaterial,
  blackRubberMaterial,
} from '../materials';
import { HitBox } from './SelectionMarker';

const ignoreRaycast = () => {
  /* decorative clamp jaws must not steal clicks from the burette */
};

export function RetortStand() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.0125, 0]}>
        <boxGeometry args={[0.3, 0.025, 0.2]} />
        <primitive object={darkMetalMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.008, 0]}>
        <boxGeometry args={[0.32, 0.012, 0.22]} />
        <primitive object={blackRubberMaterial} attach="material" />
      </mesh>
      <mesh castShadow position={[0, 0.46, 0.04]}>
        <cylinderGeometry args={[0.011, 0.012, 0.9, 14]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.9, 0.04]}>
        <sphereGeometry args={[0.011, 12, 8]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>

      {/* boss head */}
      <mesh castShadow position={[0, 0.56, 0.04]}>
        <boxGeometry args={[0.045, 0.05, 0.05]} />
        <primitive object={darkMetalMaterial} attach="material" />
      </mesh>
      <mesh position={[0.026, 0.56, 0.04]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.014, 10]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>

      {/* clamp arm */}
      <mesh castShadow position={[0.15, 0.56, 0.04]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.008, 0.008, 0.3, 10]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      <mesh castShadow position={[0.3, 0.56, 0.04]}>
        <boxGeometry args={[0.026, 0.07, 0.028]} />
        <primitive object={darkMetalMaterial} attach="material" />
      </mesh>
      {[-0.022, 0.022].map((z) => (
        <mesh
          key={z}
          castShadow
          position={[0.31, 0.56, 0.04 + z]}
          raycast={ignoreRaycast}
        >
          <boxGeometry args={[0.05, 0.075, 0.012]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
      ))}
      <mesh position={[0.31, 0.56, 0.04]} rotation-x={Math.PI / 2} raycast={ignoreRaycast}>
        <cylinderGeometry args={[0.009, 0.009, 0.085, 10]} />
        <primitive object={metalMaterial} attach="material" />
      </mesh>
      <mesh position={[0.31, 0.56, 0.085]} rotation-x={Math.PI / 2} raycast={ignoreRaycast}>
        <cylinderGeometry args={[0.012, 0.012, 0.012, 10]} />
        <primitive object={blackRubberMaterial} attach="material" />
      </mesh>

      <HitBox size={[0.32, 0.04, 0.23]} position={[0, 0.02, 0]} partId="base" />
      <HitBox size={[0.04, 0.9, 0.04]} position={[0, 0.47, 0.04]} partId="rod" />
    </group>
  );
}
