import { create } from 'zustand';

interface UiState {
  renderFps: number;
  webglReady: boolean;
  setRenderFps: (fps: number) => void;
  setWebglReady: (ready: boolean) => void;
}

/** High-frequency render telemetry kept out of the lab state. */
export const useUiStore = create<UiState>((set) => ({
  renderFps: 0,
  webglReady: false,
  setRenderFps: (renderFps) => set({ renderFps }),
  setWebglReady: (webglReady) => set({ webglReady }),
}));
