import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { ApparatusId } from '../../domain/types';
import { useLabStore } from '../../store/labStore';
import { SelectionMarker } from '../apparatus/SelectionMarker';

type BodyType = Parameters<RapierRigidBody['setBodyType']>[0];
const DYNAMIC = 0 as unknown as BodyType;
const FIXED = 1 as unknown as BodyType;
const KINEMATIC = 2 as unknown as BodyType;

interface PhysicsApparatusProps {
  id: ApparatusId;
  /** Half extents of the approximate collider, in metres. */
  collider: [number, number, number];
  labelHeight: number;
  children: ReactNode;
}

/**
 * Solid apparatus with a Rapier rigid body.
 *  - fixed       → snapped into a lab slot / resting in a rack
 *  - kinematic   → being carried by hand, mouse or keyboard
 *  - dynamic     → released on the bench and allowed to settle/collide
 */
export function PhysicsApparatus({ id, collider, labelHeight, children }: PhysicsApparatusProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const grabbed = useLabStore((state) => state.interaction.grabbedId === id);
  const placement = useLabStore((state) => state.placements[id]);
  const positionVector = useRef(new THREE.Vector3());
  const quaternion = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler());

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    positionVector.current.set(...placement.position);
    euler.current.set(...placement.rotation);
    quaternion.current.setFromEuler(euler.current);
    if (grabbed) {
      body.setBodyType(KINEMATIC, true);
      body.setTranslation(positionVector.current, true);
      body.setRotation(quaternion.current, true);
      return;
    }
    if (placement.snappedTo) {
      body.setBodyType(FIXED, true);
      body.setTranslation(positionVector.current, true);
      body.setRotation(quaternion.current, true);
      return;
    }
    const current = body.translation();
    if (Math.hypot(current.x - placement.position[0], current.z - placement.position[2]) > 0.04) {
      body.setTranslation(positionVector.current, true);
    }
    body.setBodyType(DYNAMIC, true);
    body.wakeUp();
  }, [grabbed, id, placement]);

  useFrame(() => {
    if (!grabbed) return;
    const body = bodyRef.current;
    if (!body) return;
    const placement = useLabStore.getState().placements[id];
    positionVector.current.set(...placement.position);
    euler.current.set(...placement.rotation);
    quaternion.current.setFromEuler(euler.current);
    body.setNextKinematicTranslation(positionVector.current);
    body.setNextKinematicRotation(quaternion.current);
  });

  return (
    <>
      <RigidBody
        key={`${id}-${placement.snappedTo ?? 'free'}`}
        ref={bodyRef}
        type={placement.snappedTo ? 'fixed' : 'dynamic'}
        colliders={false}
        position={placement.position}
        rotation={placement.rotation}
        linearDamping={2.6}
        angularDamping={5}
        lockRotations
        canSleep
        ccd
      >
        <CuboidCollider
          args={collider}
          position={[0, collider[1] + 0.002, 0]}
          friction={0.9}
          restitution={0.02}
        />
        <group userData={{ apparatusId: id }}>{children}</group>
      </RigidBody>
      <SelectionMarker id={id} labelHeight={labelHeight} />
    </>
  );
}
