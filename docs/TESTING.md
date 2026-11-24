# Testing & Validation Report

**Build:** LabBase Virtual Titration Lab v1.0
**Date:** 2026-11-04 (UTC)
**Environment:** Windows, Node 24.11.1, Chrome 156 (headless and ANGLE D3D11), AMD Radeon integrated GPU
**Browser URL used:** production build served by `vite preview` at `http://127.0.0.1:4173/`

> A feature is only listed as validated here after it was exercised by an automated test or a browser run. The one
> residual check is a physical-hand webcam pass, called out explicitly below.

## 1. Automated test suite

Command:

```bash
pnpm test
```

Result: **10 test files, 101 tests passed, 0 failed** (Vitest 3.2.7, jsdom environment).
TypeScript strict check (`pnpm typecheck`) passes with 0 errors. Production build succeeds with code-split chunks.

| Spec file | Tests | Prompt requirement covered |
|---|---:|---|
| `src/gestures/gestures.test.ts` | 27 | Gesture classification (open/fist/point/peace/pinch), realistic fist-like pinch, pinch contact geometry, calibration thresholds, wrist roll, two-hand distance, pose debouncing, edge cooldown, pinch release debounce, dwell, engine edges, hysteresis, tracking-loss grace, reacquire, disabled features, reset |
| `src/interaction/machine.test.ts` | 9 | Object selection, hover→select, pick-up, movement, release, cancel, inspector, nearest raycast candidate |
| `src/interaction/keyboard.test.ts` | 6 | Mouse/keyboard fallback mapping, editable targets, modifier handling |
| `src/domain/chemistry.test.ts` | 8 | pH before/at/after equivalence, clamps, phenolphthalein thresholds, indicator absence, colour mixing |
| `src/domain/containers.test.ts` | 7 | Volume/solute conservation over 400 randomised transfers, capacities, no negative volumes, fill/dispense/pipette/indicator helpers |
| `src/domain/titration.test.ts` | 10 | Unknown generation, titre→concentration, error/grade, invalid readings, progress gating, endpoint transitions, PRNG determinism |
| `src/domain/placement.test.ts` | 7 | Snap radius, occupied-zone rejection, flask bay, free placement, burette rest fallback, bench clamping |
| `src/tracking/camera.test.ts` | 9 | Permission denied, missing/busy/unsupported/security/constraints errors, front camera constraints, tracker lifecycle, frame deduplication, mirroring, frame skipping, no network fetch |
| `src/store/labStore.test.ts` | 12 | Deterministic reset, unclamped fill refusal, arrange, pipette/indicator/fill, conservation, mouse/keyboard movement/rotation, cancel, keyboard nudge, complete titration, auto-stop, gating, Space workflow, flow safety stop |
| `src/ui/fallback.test.tsx` | 6 | Action controls present, click-to-pipette without camera, camera failure card, retry, idle camera start, pinch calibration from live samples |

Notable assertions:

- **Conservation:** after every step of a 400-transfer random sequence, and after the complete titration, total volume,
  HCl moles, NaOH moles and indicator volume remain invariant within `1e-6`.
- **Endpoint:** pH < 7 before equivalence, 7 at exact equivalence, > 9 one drop after; pH 8.2 threshold for
  phenolphthalein.
- **Camera privacy:** a test spies on `fetch` during tracker startup/inference and asserts it is never called.
- **Workflow:** a full run completes all 7 steps and calculates a concentration within 3% of the true value.
- **Pinch robustness:** a realistic pinch with curled fingers is accepted even when the pose classifier calls it a
  fist; a true fist is still rejected using the thumb/index contact distance; a brief tracking dropout keeps the
  pinch active, and reacquisition does not emit a second pinch-start edge.
- **Pinch calibration:** samples become a closed-pinch calibration value, the threshold widens, and the camera-panel
  calibration flow writes the value into persisted settings.

## 2. Browser verification (Chrome 156)

Scripts in `scripts/` use Playwright Core against the production build. All runs reported **no page errors and no
console errors** (the only console warning was an upstream Rapier "deprecated initialization parameters" warning).

| Script | Result | What it proves |
|---|---|---|
| `scripts/smoke.mjs` | **PASS** | Load, WebGL canvas, arrange → pipette → indicator → fill → auto-stop titration → record → calculate, result displayed, help overlay opens/closes |
| `scripts/camera-smoke.mjs` | **PASS** | MediaPipe model + WASM load, fake webcam stream, status becomes **Camera live**, no error card, stop camera available |
| `scripts/camera-denied.mjs` | **PASS** | Chrome permission denial shows "Camera permission denied", Retry and **Continue without camera**, continuing returns to camera-off state, no crash |
| `scripts/interaction-smoke.mjs` | **PASS** | Mouse drag grabs and snaps the flask; synthetic gesture frames through the real `GestureBridge` grab and snap the burette into the clamp, grab/rotate (0.25 rad)/snap the flask, fist-fill the burette, start a stream and close it, and point-dwell activate the Pipette button to deliver the aliquot |
| `scripts/mobile-smoke.mjs` | **PASS** | 390×844 phone viewport: dock visible, Lab/Equipment/Data/Camera sheets open and close, no page errors |
| `scripts/layout-smoke.mjs` | **PASS** | No horizontal overlap between dock and side rails at 1024×768, 1280×800, 1512×900 |
| `scripts/performance-smoke.mjs hardware` | **PASS** | 140–144 fps at 1280×800, adaptive quality does not downgrade |
| `scripts/performance-smoke.mjs software` | **PASS (degradation)** | SwiftShader 2–3 fps; adaptive governor moves Balanced → Performance after ~9 s |
| Docker Compose (`docker compose up -d --build`) | **PASS** | Multi-stage image builds; nginx container healthy on `http://localhost:8090`; full smoke and MediaPipe camera test pass through the container |
| Docker only (`docker run -p 8091:80 labbase:test`) | **PASS** | `/healthz` returns `ok`, root and favicon return 200 |

End-to-end result examples (different random seeds): `0.1132 mol dm⁻³` (0.14% error, Excellent), `0.1392 mol dm⁻³`
(0.14%, Excellent), `0.0872 mol dm⁻³` (0.28%, Excellent). All titres were volume-conserving.

### What the browser tests exercise through the real app

- The chemistry flow ticker runs from render frames, not React timers, and stops at the endpoint.
- The 3D raycast controllers (window-capture pointer and hand frame) both feed the same manipulation store.
- Physics bodies remount on snap, so the flask visual moves with its selection marker into the titration bay.
- Fist action mapping: empty burette → fill; filled burette → stopcock toggle; selected flask → record/calculate.
- Point-dwell on a DOM control is routed to the control (verified by activating Pipette through a synthetic point
  frame), while point-dwell in the canvas selects 3D equipment.
- Pinch assist: hovering the flask, then beginning a pinch ~60 px away from it, still grabs the flask through the
  recent-hover + multi-anchor raycast fallback.
- Pinch dropout: a no-hand frame with `trackingLost=false` keeps the object grabbed; the subsequent tracking-lost
  frame releases it.
- Gesture-only path coverage: pinch grab / open release, wrist rotation, point UI activation, fist fill/flow/stop,
  and both burette and flask drags into their snap slots have all been exercised through the real bridge. This is the
  complete set needed for the gesture acceptance sequence in [ACCEPTANCE.md](ACCEPTANCE.md), apart from the
  physical-hand recognition step.

## 2b. Container validation

Docker 29.8.2 / Docker Compose v5.6.0, Linux containers on WSL2.

```bash
docker compose up -d --build
# host port 8090 -> container port 80
```

| Check | Result |
|---|---|
| Multi-stage build (Node 24 + pnpm → nginx 1.27) | Pass |
| Image size | 82.7 MB |
| Container health after start | `Up ... (healthy)` |
| `GET /healthz` | `200 ok` |
| Root HTML and SPA deep link `/some/deep/link` | `200`, LabBase index served |
| `/mediapipe/wasm/vision_wasm_internal.wasm` | `200`, `Content-Type: application/wasm`, 11,510,753 bytes |
| `/models/hand_landmarker.task` | `200`, `application/octet-stream`, 7,819,105 bytes |
| Security headers | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy: camera=(self), …` |
| `index.html` caching | `Cache-Control: no-cache` |
| MediaPipe camera startup through nginx | Pass (fake webcam, no error card) |
| Full titration smoke through nginx | Pass (calculated result, no console/page errors) |
| Plain `docker run -p 8091:80` | Pass (health, root and favicon 200) |
| Runtime memory | ~10.7 MiB container RSS |

The compose port defaults to **8090** because port 8080 was already used by an unrelated Apache process on
this machine. `LABBASE_PORT` overrides it. The container does not need camera passthrough; the browser camera
stays on the host.

## 2c. Pinch reliability changes and evidence

The original pinch implementation was fragile in five specific ways. Each was addressed and covered:

| Failure mode | Previous behaviour | Fix | Evidence |
|---|---|---|---|
| Cursor jumped at pinch start | Hover used palm centre, pinch used thumb/index midpoint | Open/other poses now use the pinch midpoint too, so the target does not move when the pinch closes | `GestureEngine` cursor logic; interaction smoke grabs burette and flask |
| Real pinch classified as a fist | Any `fist` pose was rejected outright | Compare the thumb/index contact distance to palm size; a fist contact is low in the palm, a real pinch is in front | `tightPinchHand` unit test; fist rejected |
| Strict fixed threshold | Auto threshold at sensitivity 55 was 0.337 | Default entry band widened; hysteresis widened; optional per-user **Calibrate** measures a closed pinch and raises the threshold | calibration unit test + CameraPanel calibration test |
| One-frame release | Ratio noise or a tracking dropout released immediately | 3-frame pinch release debounce; 320 ms hand-loss grace keeps pinch and object active | release-latch and tracking-dropout unit tests; browser dropout test held the flask then released |
| Pinch missed the object | Single ray at a jittery pinch point | Try pinch point, index tip and palm centre; small screen-space ring; recent-hover fallback within 1.2 s; 650 ms acquisition window | browser test pinched ~60 px off the flask and still grabbed it |

Additional diagnostics: the camera panel now shows the live pinch gap and active threshold. Calibration is stored locally and can be reset
without touching other gesture settings.

## 3. Performance measurements

Measured on the production build with `renderer.info` and a one-second render-FPS probe.

| Setting | Renderer | FPS | Draw calls | Triangles | Geometries | Textures |
|---|---|---:|---:|---:|---:|---:|
| Balanced, 1280×800 | ANGLE D3D11, AMD Radeon integrated | 143–144 | 175 | 12,116 | 146 | 9 |
| Performance, same | same | 144 | 175 | 12,116 | 146 | 9 |
| Balanced, SwiftShader | software | 2 | 175 | 12,116 | 146 | 9 |
| After auto-degrade | software | 3 | 175 | 12,116 | 146 | 9 |

- Adaptive quality: low FPS for >3 s triggers a downgrade no more than once every 9 s; verified Balanced → Performance.
- Hand-tracking frame skip is 2 in Performance; camera request is 640×480.
- DPR ranges: High 1–1.75, Balanced 1–1.4, Performance 0.8–1.
- Final production chunks: app 116 kB, lab scene 45 kB, React 249 kB, R3F 178 kB, Three 734 kB, physics (Rapier
  WASM base64) 2.26 MB, MediaPipe 136 kB (lazy, camera only). All minified sizes; gzip total for the initial lab load
  is about 1.2 MB.

## 4. Manual checks performed

| Check | Result |
|---|---|
| Mouse-only complete titration | Pass (browser smoke) |
| Keyboard shortcuts (`Space`, `E`, `G`, `S`, `B`, `1/2/3`, arrows, `[`/`]`, `C`, `Esc`) | Pass (unit-mapped; Space flow and shortcut labels exercised in browser) |
| Touch phone layout at 390×844 | Pass (sheets and dock usable) |
| Camera permission denial recoverable | Pass |
| Help and gesture guide | Pass |
| Adaptive quality on software renderer | Pass |
| Reset produces a new unknown sample | Pass (store tests) |
| Volume conservation after full run | Pass |
| Point-dwell activates a UI control | Pass (synthetic point frame → Pipette) |
| Fist fill / stream / stop sequence | Pass (synthetic fist frames → `filled=true`, `flow=stream`, `flow=off`) |
| Burette gesture drag → clamp | Pass (`grabbed=burette`, `snappedTo=buretteClamp`) |
| Flask gesture drag → bay | Pass (`snappedTo=flaskBay`) |
| Gesture wrist rotation | Pass (rotation y = 0.25 rad while held) |
| Pinch slightly off-target | Pass (`grabbed=flask` via recent-hover assist) |
| Brief pinch tracking dropout | Pass (object held, then released on tracking-lost) |
| Pinch calibration UI | Pass (samples → persisted threshold) |
| Fist-like real pinch | Pass (unit test; thumb/index contact in front of palm) |
| True fist rejection | Pass (contact distance below palm threshold) |

## 5. Residual validation (honest status)

The following was **not** physically performed in this build environment and should be done by a human with a webcam:

1. Real-hand recognition of all six gestures under normal room lighting (open, fist, point, pinch, wrist twist,
   two hands), including the configured sensitivity.
2. A complete end-to-end titration driven **only** by real hand gestures, following [ACCEPTANCE.md](ACCEPTANCE.md).

Supporting evidence already in place: MediaPipe successfully initialises and tracks a real camera device in Chrome;
the gesture engine is unit-tested on synthetic 21-landmark hands; and synthetic gesture frames fed through the actual
`GestureBridge` produce real 3D grabs, rotation, snaps and fist operations in the running app. The only unverified link
is the physical hand → MediaPipe landmarks step for every gesture, which cannot be simulated faithfully headlessly.

## 6. Reproduce

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm preview --port 4173

# in another terminal, with Chrome installed:
node scripts/smoke.mjs
node scripts/camera-smoke.mjs
node scripts/camera-denied.mjs
node scripts/interaction-smoke.mjs
node scripts/mobile-smoke.mjs
node scripts/performance-smoke.mjs hardware

# container path
docker compose up -d --build
$env:APP_URL = "http://127.0.0.1:8090/"; node scripts/smoke.mjs
$env:APP_URL = "http://127.0.0.1:8090/?debug=1"; node scripts/camera-smoke.mjs
docker compose down
```

Screenshots from the verified runs are stored in `artifacts/` and selected copies in `docs/screenshots/`.
