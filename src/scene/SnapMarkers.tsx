import { useMemo } from 'react';
import { SNAP_ZONES } from '../domain/placement';
import { useLabStore } from '../store/labStore';

export function SnapMarkers() {
  const hoveredId = useLabStore((state) => state.interaction.hoveredId);
  const grabbedId = useLabStore((state) => state.interaction.grabbedId);
  const zones = useMemo(
    () =>
      SNAP_ZONES.filter((zone) =>
        ['flaskBay', 'beakerZone', 'cylinderZone', 'washBottleZone', 'buretteClamp', 'pipetteRack'].includes(
          zone.id,
        ),
      ),
    [],
  );

  return (
    <group>
      {zones.map((zone) => {
        const active =
          hoveredId === zone.apparatusId ||
          grabbedId === zone.apparatusId ||
          (zone.id === 'flaskBay' && hoveredId === 'flask');
        const color = zone.id === 'flaskBay' ? '#f2b84b' : '#74b9ae';
        const radius = zone.id === 'flaskBay' ? 0.092 : 0.06;
        return (
          <group key={zone.id} position={[zone.position[0], 0.807, zone.position[2]]}>
            <mesh rotation-x={-Math.PI / 2}>
              <ringGeometry args={[radius, radius + 0.007, 48]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={active ? 0.95 : zone.id === 'flaskBay' ? 0.5 : 0.26}
                depthWrite={false}
              />
            </mesh>
            {zone.id === 'flaskBay' && (
              <>
                <mesh rotation-x={-Math.PI / 2}>
                  <planeGeometry args={[0.24, 0.0025]} />
                  <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
                </mesh>
                <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2}>
                  <planeGeometry args={[0.24, 0.0025]} />
                  <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
      {/* clamp alignment marker on the bench under the retort stand */}
      <mesh rotation-x={-Math.PI / 2} position={[-0.62, 0.807, -0.06]}>
        <ringGeometry args={[0.03, 0.036, 32]} />
        <meshBasicMaterial color="#f2b84b" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}
