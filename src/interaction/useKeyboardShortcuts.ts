import { useEffect, useRef } from 'react';
import { APPARATUS_ORDER } from '../domain/catalogue';
import { useLabStore } from '../store/labStore';
import type { HandTrackingApi } from '../tracking/useHandTracking';
import { runPrimaryAction } from './actions';
import { isEditableTarget, resolveKeyboardCommand } from './keyboard';

interface KeyboardOptions {
  tracking: HandTrackingApi;
  helpOpen: boolean;
  settingsOpen: boolean;
  mobileOpen: boolean;
  onToggleHelp: () => void;
  onToggleSettings: () => void;
  onCloseMobile: () => void;
}

export function useKeyboardShortcuts({
  tracking,
  helpOpen,
  settingsOpen,
  mobileOpen,
  onToggleHelp,
  onToggleSettings,
  onCloseMobile,
}: KeyboardOptions) {
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        if (event.key === 'Escape') {
          (event.target as HTMLElement).blur();
        }
        return;
      }
      const command = resolveKeyboardCommand({
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        repeat: event.repeat,
      });
      if (!command) return;

      const state = useLabStore.getState();
      const activationTarget =
        event.target instanceof HTMLElement
          ? event.target.closest('button, a, [role="button"]')
          : null;
      if (activationTarget && command.type === 'primary') return;

      if (command.type !== 'nudge' && command.type !== 'rotate' && event.repeat) return;

      if (helpOpen || settingsOpen) {
        if (command.type === 'escape') {
          if (helpOpen) onToggleHelp();
          if (settingsOpen) onToggleSettings();
        } else if (command.type === 'help' && helpOpen) {
          onToggleHelp();
        } else if (command.type === 'settings' && settingsOpen) {
          onToggleSettings();
        }
        return;
      }

      if (state.interaction.inspected && command.type !== 'escape') return;

      if (command.type === 'escape') {
        if (state.interaction.grabbedId) state.cancelGrab();
        else if (state.interaction.inspected) state.closeInspector();
        else if (mobileOpen) onCloseMobile();
        else state.deselect();
        return;
      }

      if (command.type === 'primary') {
        if (state.interaction.grabbedId) state.endGrab();
        else runPrimaryAction();
      } else if (command.type === 'grab') {
        if (state.interaction.grabbedId) state.endGrab();
        else if (state.interaction.selectedId) state.beginGrab(state.interaction.selectedId, 'keyboard');
        else state.notify('info', 'Nothing selected', 'Select equipment with the list or by pointing at it.');
      } else if (command.type === 'snap-home') {
        state.snapSelectedToHome();
      } else if (command.type === 'inspect') {
        if (state.interaction.selectedId) state.inspectApparatus(state.interaction.selectedId);
        else state.notify('info', 'Nothing selected', 'Select equipment first.');
      } else if (command.type === 'cycle') {
        const current = state.interaction.selectedId;
        const index = current ? APPARATUS_ORDER.indexOf(current) : -1;
        const next = APPARATUS_ORDER[(index + command.direction + APPARATUS_ORDER.length) % APPARATUS_ORDER.length];
        state.selectApparatus(next);
      } else if (command.type === 'nudge') {
        state.nudgeSelected(command.dx, command.dz);
      } else if (command.type === 'rotate') {
        state.rotateSelected(command.delta);
      } else if (command.type === 'toggle-flow') {
        state.toggleStopcock();
      } else if (command.type === 'flow') {
        state.setFlow(command.mode);
      } else if (command.type === 'fill') {
        state.actionFillBurette();
      } else if (command.type === 'pipette') {
        state.actionPipette();
      } else if (command.type === 'indicator') {
        state.actionIndicator();
      } else if (command.type === 'water') {
        state.actionWater();
      } else if (command.type === 'record') {
        state.recordReading();
      } else if (command.type === 'calculate') {
        state.calculate();
      } else if (command.type === 'camera') {
        const trackingNow = trackingRef.current;
        if (trackingNow.status === 'tracking') trackingNow.stop();
        else void trackingNow.start();
      } else if (command.type === 'help') {
        onToggleHelp();
      } else if (command.type === 'settings') {
        onToggleSettings();
      } else if (command.type === 'reset') {
        state.reset();
        onCloseMobile();
      }

      if (
        command.type === 'nudge' ||
        command.type === 'rotate' ||
        command.type === 'primary' ||
        command.type === 'toggle-flow' ||
        command.type === 'flow'
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [helpOpen, mobileOpen, onCloseMobile, onToggleHelp, onToggleSettings, settingsOpen]);
}
