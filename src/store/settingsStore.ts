import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QualityPreset } from '../domain/constants';
import { DEFAULT_GESTURE_CONFIG } from '../gestures/landmarks';
import type { FistAction, GestureConfig, GestureFeatureFlags } from '../gestures/types';

export interface SettingsState {
  quality: QualityPreset;
  autoQuality: boolean;
  gesture: GestureConfig;
  autoStopAtEndpoint: boolean;
  showFps: boolean;
  showGrid: boolean;
  reducedMotion: boolean;
  setQuality: (quality: QualityPreset) => void;
  setAutoQuality: (enabled: boolean) => void;
  setSensitivity: (value: number) => void;
  setGesture: (patch: Partial<GestureConfig>) => void;
  setGestureFeature: (feature: keyof GestureFeatureFlags, enabled: boolean) => void;
  setFistAction: (action: FistAction) => void;
  setAutoStop: (enabled: boolean) => void;
  setShowFps: (enabled: boolean) => void;
  setShowGrid: (visible: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  resetSettings: () => void;
}

const defaults = {
  quality: 'balanced' as QualityPreset,
  autoQuality: true,
  gesture: DEFAULT_GESTURE_CONFIG,
  autoStopAtEndpoint: false,
  showFps: true,
  showGrid: false,
  reducedMotion: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setQuality: (quality) => set({ quality }),
      setAutoQuality: (autoQuality) => set({ autoQuality }),
      setSensitivity: (value) =>
        set((state) => ({
          gesture: { ...state.gesture, sensitivity: Math.min(100, Math.max(0, value)) },
        })),
      setGesture: (patch) => set((state) => ({ gesture: { ...state.gesture, ...patch } })),
      setGestureFeature: (feature, enabled) =>
        set((state) => ({
          gesture: {
            ...state.gesture,
            enabled: { ...state.gesture.enabled, [feature]: enabled },
          },
        })),
      setFistAction: (fistAction) =>
        set((state) => ({ gesture: { ...state.gesture, fistAction } })),
      setAutoStop: (autoStopAtEndpoint) => set({ autoStopAtEndpoint }),
      setShowFps: (showFps) => set({ showFps }),
      setShowGrid: (showGrid) => set({ showGrid }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      resetSettings: () => set({ ...defaults, gesture: { ...DEFAULT_GESTURE_CONFIG } }),
    }),
    {
      name: 'labbase-settings-v1',
      partialize: (state) => ({
        quality: state.quality,
        autoQuality: state.autoQuality,
        gesture: state.gesture,
        autoStopAtEndpoint: state.autoStopAtEndpoint,
        showFps: state.showFps,
        showGrid: state.showGrid,
        reducedMotion: state.reducedMotion,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...saved,
          gesture: {
            ...DEFAULT_GESTURE_CONFIG,
            ...(saved.gesture ?? {}),
            enabled: {
              ...DEFAULT_GESTURE_CONFIG.enabled,
              ...(saved.gesture?.enabled ?? {}),
            },
          },
        };
      },
    },
  ),
);
