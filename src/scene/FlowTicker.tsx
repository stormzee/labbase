import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { QUALITY_PRESETS } from '../domain/constants';
import { useLabStore } from '../store/labStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';

/** Reports real render FPS to the HUD once per second. */
export function RenderStatsProbe() {
  const elapsed = useRef(0);
  const frames = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    frames.current += 1;
    if (elapsed.current >= 1) {
      useUiStore.getState().setRenderFps(Math.round(frames.current / elapsed.current));
      elapsed.current = 0;
      frames.current = 0;
    }
  });
  return null;
}

/** Drives the authoritative flow loop from render frames at ~20 Hz. */
export function FlowTicker() {
  const autoStop = useSettingsStore((state) => state.autoStopAtEndpoint);
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    const store = useLabStore.getState();
    if (store.flow === 'off') {
      accumulator.current = 0;
      return;
    }
    // Do not tie the chemistry clock to render FPS: low-end GPUs can dip to 15–20 fps.
    accumulator.current += Math.min(0.5, Math.max(0, delta));
    if (accumulator.current < 0.05) return;
    const step = accumulator.current;
    accumulator.current = 0;
    store.tickFlow(step, autoStop);
  });

  return null;
}

/** Downgrades visual quality after sustained low frame rate on weaker laptops. */
export function AdaptiveQuality() {
  const autoQuality = useSettingsStore((state) => state.autoQuality);
  const samples = useRef({ elapsed: 0, frames: 0, lastChange: 0 });
  useFrame((_, delta) => {
    if (!autoQuality) return;
    const quality = useSettingsStore.getState().quality;
    if (quality === 'performance') return;
    const now = performance.now();
    samples.current.elapsed += delta;
    samples.current.frames += 1;
    if (samples.current.elapsed < 3) return;
    const fps = samples.current.frames / samples.current.elapsed;
    samples.current.elapsed = 0;
    samples.current.frames = 0;
    if (fps < 32 && now - samples.current.lastChange > 9000) {
      samples.current.lastChange = now;
      const next = quality === 'high' ? 'balanced' : 'performance';
      useSettingsStore.getState().setQuality(next);
      useLabStore
        .getState()
        .notify(
          'info',
          'Graphics auto-adjusted',
          `Frame rate was ${Math.round(fps)} fps, so quality moved to “${next}”. You can change it in settings.`,
        );
    }
  });
  return null;
}

export const QUALITY = QUALITY_PRESETS;
