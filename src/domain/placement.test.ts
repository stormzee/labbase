import { describe, expect, it } from 'vitest';
import {
  INITIAL_PLACEMENTS,
  SNAP_ZONES,
  clampToBench,
  distanceXZ,
  findSnap,
  resolvePlacement,
  zoneById,
} from '../domain/placement';
import type { ApparatusPlacements } from '../domain/types';

describe('apparatus placement', () => {
  it('initial layout is valid and starts unarranged', () => {
    expect(INITIAL_PLACEMENTS.burette.snappedTo).toBe('buretteRest');
    expect(INITIAL_PLACEMENTS.flask.snappedTo).toBeNull();
    expect(INITIAL_PLACEMENTS.pipette.snappedTo).toBe('pipetteRack');
    expect(zoneById('buretteClamp')).toBeDefined();
  });

  it('snaps the burette to the clamp only near the clamp', () => {
    const clamp = SNAP_ZONES.find((zone) => zone.id === 'buretteClamp')!;
    expect(findSnap('burette', clamp.position)?.id).toBe('buretteClamp');
    expect(findSnap('burette', [clamp.position[0] + 0.5, 0.8, clamp.position[2]])).toBeNull();
  });

  it('rejects a zone occupied by another apparatus', () => {
    const placements = {
      ...INITIAL_PLACEMENTS,
      cylinder: { ...INITIAL_PLACEMENTS.cylinder, snappedTo: 'beakerZone' },
    } as ApparatusPlacements;
    expect(findSnap('beaker', [0.6, 0.8, 0.24], placements)).toBeNull();
  });

  it('resolves flask releases to the titration bay', () => {
    const resolved = resolvePlacement({ apparatusId: 'flask', position: [-0.63, 0.8, -0.05] });
    expect(resolved.snappedTo).toBe('flaskBay');
    expect(resolved.rotation).toEqual([0, 0, 0]);
    expect(resolved.position[1]).toBeCloseTo(0.8, 5);
  });

  it('lets the flask rest anywhere on the bench without snapping', () => {
    const resolved = resolvePlacement({ apparatusId: 'flask', position: [0.2, 0.9, 0.1] });
    expect(resolved.snappedTo).toBeNull();
    expect(distanceXZ(resolved.position, [0.2, 0.8, 0.1])).toBeCloseTo(0, 6);
  });

  it('never lets a free burette float: it returns to the bench rest', () => {
    const resolved = resolvePlacement({ apparatusId: 'burette', position: [1.0, 1.4, 0.2] });
    expect(resolved.snappedTo).toBe('buretteRest');
    expect(resolved.rotation[2]).toBeCloseTo(Math.PI / 2, 5);
  });

  it('clamps free positions to the bench bounds', () => {
    const clamp = clampToBench([99, 2, -99]);
    expect(clamp[0]).toBeLessThanOrEqual(1.08);
    expect(clamp[2]).toBeGreaterThanOrEqual(-0.33);
    expect(clamp[1]).toBe(0.8);
  });
});
