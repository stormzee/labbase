import { describe, expect, it } from 'vitest';
import { resolveKeyboardCommand, isEditableTarget } from '../interaction/keyboard';

describe('keyboard fallback mapping', () => {
  it('maps the primary workflow shortcuts', () => {
    expect(resolveKeyboardCommand({ key: ' ' })).toEqual({ type: 'primary' });
    expect(resolveKeyboardCommand({ key: 'f' })).toEqual({ type: 'fill' });
    expect(resolveKeyboardCommand({ key: 'p' })).toEqual({ type: 'pipette' });
    expect(resolveKeyboardCommand({ key: 'i' })).toEqual({ type: 'indicator' });
    expect(resolveKeyboardCommand({ key: 'b' })).toEqual({ type: 'toggle-flow' });
    expect(resolveKeyboardCommand({ key: 'n' })).toEqual({ type: 'record' });
    expect(resolveKeyboardCommand({ key: 'c' })).toEqual({ type: 'camera' });
    expect(resolveKeyboardCommand({ key: 's' })).toEqual({ type: 'snap-home' });
    expect(resolveKeyboardCommand({ key: 'g' })).toEqual({ type: 'grab' });
    expect(resolveKeyboardCommand({ key: 'e' })).toEqual({ type: 'inspect' });
  });

  it('maps flow modes and movement', () => {
    expect(resolveKeyboardCommand({ key: '1' })).toEqual({ type: 'flow', mode: 'off' });
    expect(resolveKeyboardCommand({ key: '2' })).toEqual({ type: 'flow', mode: 'drop' });
    expect(resolveKeyboardCommand({ key: '3' })).toEqual({ type: 'flow', mode: 'stream' });
    expect(resolveKeyboardCommand({ key: 'ArrowLeft' })).toEqual({ type: 'nudge', dx: -0.03, dz: 0 });
    expect(resolveKeyboardCommand({ key: 'ArrowUp' })).toEqual({ type: 'nudge', dx: 0, dz: -0.03 });
    expect(resolveKeyboardCommand({ key: ']' })).toEqual({ type: 'rotate', delta: Math.PI / 12 });
  });

  it('requires Shift for reset and ignores browser modifiers', () => {
    expect(resolveKeyboardCommand({ key: 'r' })).toBeNull();
    expect(resolveKeyboardCommand({ key: 'R', shiftKey: true })).toEqual({ type: 'reset' });
    expect(resolveKeyboardCommand({ key: 'p', ctrlKey: true })).toBeNull();
    expect(resolveKeyboardCommand({ key: 'p', metaKey: true })).toBeNull();
    expect(resolveKeyboardCommand({ key: 'p', altKey: true })).toBeNull();
  });

  it('cycles equipment in both directions', () => {
    expect(resolveKeyboardCommand({ key: 'q' })).toEqual({ type: 'cycle', direction: 1 });
    expect(resolveKeyboardCommand({ key: 'Q', shiftKey: true })).toEqual({ type: 'cycle', direction: -1 });
  });

  it('maps help, settings, escape and enter', () => {
    expect(resolveKeyboardCommand({ key: 'h' })).toEqual({ type: 'help' });
    expect(resolveKeyboardCommand({ key: '?' })).toEqual({ type: 'help' });
    expect(resolveKeyboardCommand({ key: ',' })).toEqual({ type: 'settings' });
    expect(resolveKeyboardCommand({ key: 'Escape' })).toEqual({ type: 'escape' });
    expect(resolveKeyboardCommand({ key: 'Enter' })).toEqual({ type: 'primary' });
    expect(resolveKeyboardCommand({ key: 'z' })).toBeNull();
  });

  it('detects editable targets', () => {
    const input = document.createElement('input');
    const div = document.createElement('div');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.append(input, div, editable);
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(div)).toBe(false);
    expect(isEditableTarget(editable)).toBe(true);
    input.remove();
    div.remove();
    editable.remove();
  });
});
