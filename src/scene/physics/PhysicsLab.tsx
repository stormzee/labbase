import { CuboidCollider, RigidBody } from '@react-three/rapier';

export function PhysicsLab() {
  return (
    <>
      {/* bench top */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.2, 0.035, 0.4]} position={[0, 0.765, 0]} friction={0.9} restitution={0.01} />
      </RigidBody>
      {/* floor */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4.5, 0.05, 4.5]} position={[0, -0.05, 0]} friction={0.95} />
      </RigidBody>
      {/* invisible bench rails stop equipment sliding off during a physics settle */}
      {[-1.21, 1.21].map((x) => (
        <RigidBody key={x} type="fixed" colliders={false}>
          <CuboidCollider args={[0.01, 0.12, 0.42]} position={[x, 0.92, 0]} />
        </RigidBody>
      ))}
      {[-0.41, 0.41].map((z) => (
        <RigidBody key={z} type="fixed" colliders={false}>
          <CuboidCollider args={[1.22, 0.12, 0.01]} position={[0, 0.92, z]} />
        </RigidBody>
      ))}
    </>
  );
}
