import { benchEdgeMaterial, benchFrameMaterial, benchTopMaterial, blackRubberMaterial, metalMaterial } from './materials';

export function Workbench() {
  return (
    <group>
      {/* top and trim */}
      <mesh castShadow receiveShadow position={[0, 0.77, 0]}>
        <boxGeometry args={[2.4, 0.06, 0.8]} />
        <primitive object={benchTopMaterial} attach="material" />
      </mesh>
      <mesh castShadow position={[0, 0.735, 0]}>
        <boxGeometry args={[2.44, 0.024, 0.84]} />
        <primitive object={benchEdgeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.86, -0.405]}>
        <boxGeometry args={[2.4, 0.1, 0.025]} />
        <primitive object={benchFrameMaterial} attach="material" />
      </mesh>

      {/* legs */}
      {[-1.13, 1.13].map((x) =>
        [-0.34, 0.34].map((z) => (
          <mesh key={`${x}-${z}`} castShadow position={[x, 0.36, z]}>
            <boxGeometry args={[0.06, 0.72, 0.06]} />
            <primitive object={benchFrameMaterial} attach="material" />
          </mesh>
        )),
      )}

      {/* lower shelf */}
      <mesh castShadow receiveShadow position={[0, 0.17, 0]}>
        <boxGeometry args={[2.2, 0.035, 0.66]} />
        <primitive object={benchFrameMaterial} attach="material" />
      </mesh>

      {/* drawers */}
      {[-0.5, 0.05].map((x) => (
        <group key={x} position={[x, 0.58, 0.405]}>
          <mesh castShadow>
            <boxGeometry args={[0.46, 0.2, 0.025]} />
            <meshStandardMaterial color="#213430" roughness={0.55} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.03, 0.022]}>
            <boxGeometry args={[0.16, 0.014, 0.014]} />
            <primitive object={metalMaterial} attach="material" />
          </mesh>
        </group>
      ))}
      <group position={[0.62, 0.58, 0.405]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.2, 0.025]} />
          <meshStandardMaterial color="#213430" roughness={0.55} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.03, 0.022]}>
          <boxGeometry args={[0.16, 0.014, 0.014]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
      </group>

      {/* under-bench storage */}
      <mesh castShadow position={[-0.42, 0.37, 0.12]}>
        <boxGeometry args={[0.42, 0.34, 0.4]} />
        <meshStandardMaterial color="#243b36" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.42, 0.37, 0.325]}>
        <boxGeometry args={[0.4, 0.3, 0.02]} />
        <meshStandardMaterial color="#2e4a44" roughness={0.65} />
      </mesh>

      {/* titration mat */}
      <mesh receiveShadow position={[-0.62, 0.804, -0.06]}>
        <boxGeometry args={[0.62, 0.008, 0.52]} />
        <primitive object={blackRubberMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[0.82, 0.804, 0.16]}>
        <boxGeometry args={[0.56, 0.006, 0.34]} />
        <primitive object={blackRubberMaterial} attach="material" />
      </mesh>

      {/* raised shelf on bench right for stock bottles */}
      <mesh castShadow receiveShadow position={[0.62, 0.83, -0.29]}>
        <boxGeometry args={[0.72, 0.02, 0.13]} />
        <primitive object={benchEdgeMaterial} attach="material" />
      </mesh>
    </group>
  );
}
