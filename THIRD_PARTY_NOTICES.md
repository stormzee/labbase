# Third-party notices

LabBase is MIT licensed (see `LICENSE`). It depends on open-source packages and redistributes two kinds of
first-party-hosted assets.

## Interaction inspiration

- **WonderSnap** — MIT, © 2026 Akbar Sheikh — <https://github.com/AkbarSheikh-debug/wondersnap>
  Used as inspiration for hand-tracking lifecycle, gesture classification/debouncing, primary/secondary hand
  selection, wrist roll, sensitivity presets and fallback philosophy. No WonderSnap source files are vendored.
  The MediaPipe hand-landmark model was originally downloaded from that repository.

## MediaPipe assets

- `public/models/hand_landmarker.task` — MediaPipe Hand Landmarker model, Apache-2.0 (Google).
- `public/mediapipe/wasm/*` — MediaPipe Tasks Vision WASM runtime, Apache-2.0 (Google).

## Runtime and build dependencies

- React, React DOM — MIT
- Three.js — MIT
- @react-three/fiber, @react-three/drei — MIT
- @react-three/rapier, @dimforge/rapier3d-compat — MIT / Apache-2.0 (Rapier)
- Zustand — MIT
- Tailwind CSS — MIT
- Vite, Vitest, TypeScript — MIT / Apache-2.0
- Playwright Core (development verification only) — Apache-2.0
- lucide-react icons — ISC

See `pnpm-lock.yaml` for exact resolved versions and each package for its full license text.
