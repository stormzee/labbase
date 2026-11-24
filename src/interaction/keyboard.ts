import type { FlowMode } from '../domain/types';

export type KeyboardCommand =
  | { type: 'toggle-flow' }
  | { type: 'flow'; mode: FlowMode }
  | { type: 'fill' }
  | { type: 'pipette' }
  | { type: 'indicator' }
  | { type: 'water' }
  | { type: 'record' }
  | { type: 'calculate' }
  | { type: 'grab' }
  | { type: 'inspect' }
  | { type: 'snap-home' }
  | { type: 'cycle'; direction: 1 | -1 }
  | { type: 'nudge'; dx: number; dz: number }
  | { type: 'rotate'; delta: number }
  | { type: 'camera' }
  | { type: 'help' }
  | { type: 'settings' }
  | { type: 'reset' }
  | { type: 'escape' }
  | { type: 'primary' };

export interface KeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
  );
}

/** Pure keyboard mapping, unit-testable and shared by real key events and the help sheet. */
export function resolveKeyboardCommand(input: KeyInput): KeyboardCommand | null {
  if (input.ctrlKey || input.metaKey || input.altKey) return null;
  const key = input.key;
  const lower = key.length === 1 ? key.toLowerCase() : key;
  if (key === 'Escape') return { type: 'escape' };
  if (key === 'Enter') return { type: 'primary' };
  if (key === ' ') return { type: 'primary' };
  if (key === 'ArrowLeft') return { type: 'nudge', dx: -0.03, dz: 0 };
  if (key === 'ArrowRight') return { type: 'nudge', dx: 0.03, dz: 0 };
  if (key === 'ArrowUp') return { type: 'nudge', dx: 0, dz: -0.03 };
  if (key === 'ArrowDown') return { type: 'nudge', dx: 0, dz: 0.03 };
  if (key === '[') return { type: 'rotate', delta: -Math.PI / 12 };
  if (key === ']') return { type: 'rotate', delta: Math.PI / 12 };
  if (lower === '?' || lower === 'h') return { type: 'help' };
  if (lower === 'r') return input.shiftKey ? { type: 'reset' } : null;
  switch (lower) {
    case 'b':
      return { type: 'toggle-flow' };
    case '1':
      return { type: 'flow', mode: 'off' };
    case '2':
      return { type: 'flow', mode: 'drop' };
    case '3':
      return { type: 'flow', mode: 'stream' };
    case 'p':
      return { type: 'pipette' };
    case 'i':
      return { type: 'indicator' };
    case 'f':
      return { type: 'fill' };
    case 'w':
      return { type: 'water' };
    case 'n':
      return { type: 'record' };
    case 'c':
      return { type: 'camera' };
    case 'g':
      return { type: 'grab' };
    case 'e':
      return { type: 'inspect' };
    case 's':
      return { type: 'snap-home' };
    case 'q':
      return { type: 'cycle', direction: input.shiftKey ? -1 : 1 };
    case ',':
      return { type: 'settings' };
    default:
      return null;
  }
}

export interface ShortcutInfo {
  keys: string;
  action: string;
}

export const KEYBOARD_SHORTCUTS: ShortcutInfo[] = [
  { keys: 'Space / Enter', action: 'Context action: arrange, pipette, indicator, fill, flow, record, calculate' },
  { keys: 'E', action: 'Inspect the selected equipment' },
  { keys: 'G', action: 'Grab / place the selected equipment' },
  { keys: 'S', action: 'Snap the selected equipment to its lab position' },
  { keys: 'Q / Shift+Q', action: 'Select next / previous equipment' },
  { keys: 'Arrow keys', action: 'Move a held apparatus by 3 cm' },
  { keys: '[ / ]', action: 'Rotate a held apparatus by 15°' },
  { keys: 'B', action: 'Open / close the burette stopcock' },
  { keys: '1 / 2 / 3', action: 'Flow off / dropwise / stream' },
  { keys: 'P', action: 'Pipette 25.00 mL of the unknown acid' },
  { keys: 'I', action: 'Add 3 drops of phenolphthalein' },
  { keys: 'F', action: 'Fill the burette from the NaOH stock' },
  { keys: 'W', action: 'Rinse the flask with 10 mL distilled water' },
  { keys: 'N', action: 'Record the final burette reading' },
  { keys: 'C', action: 'Start / stop the camera' },
  { keys: 'Esc', action: 'Cancel a drag, close a dialog, or deselect' },
  { keys: 'Shift+R', action: 'Reset the experiment' },
];
