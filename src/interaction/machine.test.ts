import { describe, expect, it } from 'vitest';
import {
  initialManipulationState,
  placementChanged,
  reduceManipulation,
  selectFromRaycast,
  type ManipulationEvent,
  type ManipulationState,
} from '../interaction/machine';
import type { Placement } from '../domain/types';

const apply = (events: ManipulationEvent[], state = initialManipulationState): ManipulationState =>
  events.reduce(reduceManipulation, state);

const origin: Placement = { position: [-0.62, 0.92, -0.06], rotation: [0, 0, 0], snappedTo: 'buretteClamp' };

describe('manipulation state machine', () => {
  it('moves from idle → hover → selected', () => {
    const state = apply([
      { type: 'hover', apparatusId: 'burette' },
      { type: 'select', apparatusId: 'burette' },
    ]);
    expect(state.phase).toBe('selected');
    expect(state.selectedId).toBe('burette');
    expect(state.hoveredId).toBe('burette');
  });

  it('grabs, drags and releases exactly one apparatus', () => {
    const state = apply([
      { type: 'select', apparatusId: 'burette' },
      { type: 'grab', apparatusId: 'burette', origin },
      { type: 'move', position: [0.1, 0.8, 0.2] },
      { type: 'release' },
    ]);
    expect(state.phase).toBe('selected');
    expect(state.grabbedId).toBeNull();
    expect(state.lastTarget).toBeNull();
    expect(state.selectedId).toBe('burette');
  });

  it('captures the original placement for cancel', () => {
    const grabbed = apply([{ type: 'grab', apparatusId: 'burette', origin }]);
    expect(grabbed.grabbedOrigin).toEqual(origin);
    const state = apply([{ type: 'move', position: [1, 0.8, 1] }, { type: 'cancel' }], grabbed);
    expect(state.phase).toBe('selected');
    expect(state.grabbedId).toBeNull();
    expect(state.grabbedOrigin).toBeNull();
  });

  it('ignores a second grab and moves while not grabbed', () => {
    const first = apply([{ type: 'grab', apparatusId: 'burette', origin }]);
    const second = reduceManipulation(first, { type: 'grab', apparatusId: 'flask', origin });
    expect(second.grabbedId).toBe('burette');
    const moved = reduceManipulation(first, { type: 'move', position: [0, 0, 0] });
    expect(moved.phase).toBe('dragging');
    expect(reduceManipulation(initialManipulationState, { type: 'move', position: [0, 0, 0] }).phase).toBe(
      'idle',
    );
  });

  it('inspects a specific part and returns to the selection', () => {
    const state = apply([
      { type: 'select', apparatusId: 'burette' },
      { type: 'inspect', apparatusId: 'burette', partId: 'stopcock' },
    ]);
    expect(state.phase).toBe('inspecting');
    expect(state.inspected?.partId).toBe('stopcock');
    expect(reduceManipulation(state, { type: 'close-inspect' }).phase).toBe('selected');
  });

  it('selecting another apparatus closes the inspector', () => {
    const state = apply([
      { type: 'inspect', apparatusId: 'burette', partId: 'tube' },
      { type: 'select', apparatusId: 'flask' },
    ]);
    expect(state.inspected).toBeNull();
    expect(state.selectedId).toBe('flask');
  });

  it('deselects cleanly', () => {
    const state = apply([
      { type: 'select', apparatusId: 'flask' },
      { type: 'deselect' },
    ]);
    expect(state.phase).toBe('idle');
    expect(state.selectedId).toBeNull();
  });

  it('picks the nearest raycast candidate with an apparatus owner', () => {
    const hit = selectFromRaycast([
      { apparatusId: 'flask', distance: 1.4 },
      { apparatusId: 'burette', partId: 'stopcock', distance: 0.8 },
      { apparatusId: 'flask', distance: 2.1 },
    ]);
    expect(hit).toEqual({ apparatusId: 'burette', partId: 'stopcock' });
    expect(selectFromRaycast([])).toBeNull();
  });

  it('detects placement changes', () => {
    expect(placementChanged(origin, { ...origin })).toBe(false);
    expect(placementChanged(origin, { ...origin, position: [0, 0, 0] })).toBe(true);
    expect(placementChanged(origin, { ...origin, snappedTo: null })).toBe(true);
    expect(placementChanged(undefined, origin)).toBe(true);
  });
});
