# LabBase — Architecture Proposal

**Project:** Virtual Science Lab · gesture-controlled acid–base titration
**Stack:** React 19 · TypeScript · Vite · Three.js · React Three Fiber · Drei · Rapier · Zustand · Tailwind CSS · MediaPipe Tasks Vision
**Reference:** [WonderSnap](https://github.com/AkbarSheikh-debug/wondersnap) (MIT) — interaction concept only.

---

## 1. System architecture

The application is split into six layers. Dependencies point **downwards only**; no lower layer
imports React, Three.js or browser APIs.

```
┌──────────────────────────────────────────────────────────────────────┐
│ 6. PRESENTATION  src/ui/*  src/App.tsx                               │
│    HUD, camera panel, inventory, instructions, measurements, help     │
├──────────────────────────────────────────────────────────────────────┤
│ 5. SCENE / RENDER  src/scene/*                                       │
│    R3F laboratory, solid apparatus meshes, liquid meshes, physics,    │
│    raycast registry, gesture cursor                                  │
├──────────────────────────────────────────────────────────────────────┤
│ 4. APPLICATION STATE  src/store/*                                    │
│    Zustand serialisable lab state, settings, transient gesture state  │
├──────────────────────────────────────────────────────────────────────┤
│ 3. INTERACTION  src/interaction/*  src/gestures/*  src/tracking/*     │
│    Manipulation state machine, gesture engine, MediaPipe camera       │
├──────────────────────────────────────────────────────────────────────┤
│ 2. DOMAIN  src/domain/*                                              │
│    Chemistry, containers/volume transfers, titration workflow,        │
│    snap zones/placement, apparatus catalogue                         │
├──────────────────────────────────────────────────────────────────────┤
│ 1. PLATFORM  src/lib/*                                               │
│    Math, smoothing, event emitter, deterministic RNG, formatting      │
└──────────────────────────────────────────────────────────────────────┘
```

### Non-negotiable separation inside the experiment

| Concern | Owner | Must never do |
|---|---|---|
| Chemistry (moles, pH, titre, concentration) | `domain/chemistry.ts`, `domain/titration.ts` | Read React state, mesh refs or frame time |
| Liquid volume bookkeeping | `domain/containers.ts` | Derive amounts from visual geometry |
| Visual liquid (glass fill, colour, drops) | `scene/liquid/*` | Be treated as a source of truth |
| User interaction | `interaction/*`, `gestures/*`, `tracking/*` | Mutate moles/volumes directly |

Every transfer goes through `transferVolume()` / `dispenseTitrant()`; those functions are
authoritative for volumes and conserve total volume and solute moles. The renderer subscribes to
the resulting container state and draws it. **Visual fill is always a projection of state.**

### Data flow

```
camera frames ─► HandTracker (MediaPipe, on-device) ─► GestureEngine
                                                     │ (pose, pinch, point, roll, two-hand)
mouse/touch/keyboard ────────────────────────────────┤
                                                     ▼
                                   ManipulationMachine + LabStore actions
                                                     │
              ┌──────────────────────────────────────┼─────────────────────────┐
              ▼                                      ▼                         ▼
      domain/chemistry & containers          apparatus placement        UI / toasts
              │                                      │
              ▼                                      ▼
      liquid geometry / colour               Rapier body type / snap       panels
```

---

## 2. Folder structure

```
labbase/
├─ Dockerfile  docker-compose.yml  docker/nginx.conf   static nginx container
├─ docs/
│  ├─ ARCHITECTURE.md          this document
│  ├─ TESTING.md               test matrix + measured results
│  └─ ACCEPTANCE.md            gesture acceptance walkthrough
├─ public/
│  ├─ models/hand_landmarker.task
│  └─ mediapipe/wasm/*         self-hosted MediaPipe runtime
├─ src/
│  ├─ main.tsx  App.tsx  index.css
│  ├─ lib/                     smoothing, formatting, screen-space mapping
│  ├─ domain/
│  │  ├─ types.ts              ApparatusId, ContainerId, liquid types
│  │  ├─ constants.ts          capacities, concentrations, endpoint pH
│  │  ├─ containers.ts         immutable volume/solute transfers, conservation
│  │  ├─ chemistry.ts          strong acid/base pH, indicator colour
│  │  ├─ titration.ts          random unknown, workup, grade, progress steps
│  │  ├─ placement.ts          snap zones, nearest-valid snap, bench clamping
│  │  └─ catalogue.ts          apparatus metadata, descriptions, parts
│  ├─ gestures/
│  │  ├─ landmarks.ts          constants, distances, finger extension
│  │  ├─ classifier.ts         pinch/open/fist/point + roll + two-hand metrics
│  │  ├─ debounce.ts           pose debouncer, edge detector, pinch hysteresis
│  │  ├─ engine.ts             frame → debounced GestureFrame; config profiles
│  │  └─ types.ts
│  ├─ tracking/
│  │  ├─ camera.ts             requestCameraStream + error mapping (injectable)
│  │  ├─ HandTracker.ts        MediaPipe lifecycle, frame timestamping, FPS
│  │  └─ useHandTracking.ts    React binding, permission/failure states
│  ├─ interaction/
│  │  ├─ machine.ts            pure manipulation state machine
│  │  ├─ actions.ts            context-sensitive primary action
│  │  ├─ keyboard.ts           pure shortcut map
│  │  └─ useKeyboardShortcuts.ts  DOM binding for shortcuts
│  ├─ store/
│  │  ├─ labStore.ts           apparatus + containers + experiment + actions
│  │  ├─ settingsStore.ts      persisted quality, gesture config, UI toggles
│  │  └─ uiStore.ts            render-FPS telemetry (high frequency)
│  ├─ scene/
│  │  ├─ LabScene.tsx  Lighting.tsx  Room.tsx  Workbench.tsx
│  │  ├─ apparatus/            Burette, Flask, Pipette, Beaker, Cylinder,
│  │  │                        WashBottle, RetortStand, ReagentBottle, Safety
│  │  ├─ liquid/               FlaskLiquid, BuretteLiquid, DropStream
│  │  ├─ physics/              PhysicsLab, PhysicsApparatus, SnapGhost
│  │  └─ interaction/          GestureBridge, PointerController, raycast helpers
│  ├─ ui/                      HUD, TopBar, EquipmentPanel, ExperimentPanel,
│  │                           MeasurementPanel, CameraPanel, ActionDock,
│  │                           HelpOverlay, SettingsPopover, ToastHost, inspector
│  └─ test/                    setup + synthetic-hand fixtures
├─ tests/ or colocated *.test.ts
├─ index.html  vite.config.ts  vitest.config.ts  tailwind.config.js
```

---

## 3. Reusable WonderSnap concepts

WonderSnap is a particle experience, not a lab, so only its **hand-interaction craft** is reused.
The particle renderer, GPU transform-feedback physics, model catalogue, explode/label system and
visual design are intentionally **not** reused.

| WonderSnap concept | Reuse | Adaptation for LabBase |
|---|---|---|
| `HandCamera` lifecycle: `getUserMedia` → `FilesetResolver` → hand landmarker, VIDEO mode, GPU→CPU fallback | **Yes, concept + lifecycle** | TS `HandTracker`, same retry-safe delegate fallback, plus permission error taxonomy and self-hosted assets |
| Only run inference on a new video frame using `currentTime`; strictly increasing timestamps | **Yes** | Same, plus frame-skip option in performance mode |
| Mirror x for a selfie view | **Yes** | Same, mapped to screen NDC and a DOM gesture cursor |
| Rotation-invariant finger-extension ratios and hand-scale normalisation | **Yes, thresholds re-derived** | `gestures/classifier.ts`, with a chemistry-specific pinch point (thumb/index midpoint) |
| Pose debouncing (hold N frames before a stable pose) | **Yes** | Generalised `PoseDebouncer` + separate pinch/fist edge latches and cooldowns |
| Primary/secondary hand selection (nearest previous primary) | **Yes** | Two-hand zoom; the secondary hand never triggers apparatus gestures |
| Wrist roll from wrist→middle-MCP, aspect-corrected and angle-smoothed | **Yes** | Drives selected-apparatus yaw and the "twist to rotate" affordance |
| Gesture sensitivity presets (standard / forgiving) | **Yes** | Plus per-gesture enable flags and exposed thresholds (debounce frames, pinch distance) |
| Keyboard/UI fallback philosophy ("everything works without a camera") | **Yes** | Full mouse, keyboard and touch parity with gesture actions |
| Pinch debounce via consecutive frames + latched rising edge | **Yes** | Pinch becomes grab; release uses hysteresis + open-hand edge. LabBase adds contact-distance fist rejection, release debounce, a 320 ms tracking-dropout hold and optional per-user calibration |
| Snap-to-summon, 250k particles, WebGL2 shaders, model morphing | **No** | Solid apparatus and chemistry simulation are required instead |

Attribution: interaction ideas derived from WonderSnap (MIT, © Akbar Sheikh); the hand landmark
model is the MediaPipe model redistributed by that project.

### Developed independently

- Chemistry engine (acid/base pH, titration workup, indicator response) — no equivalent exists.
- Conservation-checked liquid container model and autoritative transfer functions.
- 3D glassware, bench, safety equipment and room built from procedural Three.js primitives.
- Snap-zone placement system (burette clamp, titration bay, bench slots) with Rapier hand-off.
- Manipulation state machine, gesture→3D raycast/controller, multi-anchor pinch target assist, DOM gesture cursor.
- Titration workflow/step gating, progress, readings worksheet and grading.
- All UI, responsive layout, performance governor and tests.

---

## 4. Interaction state machine

Manipulation is a pure reducer (`interaction/machine.ts`), independent of R3F and of gestures.
Gestures, mouse and touch all emit the same events.

```
                POINTER_OVER(id)
      ┌────────┐ ───────────────► ┌─────────┐  PRESS(id)   ┌─────────┐
      │  idle  │                │  hover  │ ───────────► │ selected│
      └────────┘ ◄───────────────└─────────┘ ◄─────────── └─────────┘
          ▲      POINTER_OUT         │          DESELECT       │
          │                          │ PRESS(id)               │ PRESS(id)
          │                          ▼                         ▼
          │                     ┌────────────────────────────────┐
          │                     │            grabbed             │
          │                     │  (origin captured, body kin.)  │
          │                     └────────────────────────────────┘
          │                                  │  MOVE
          │                                  ▼
          │                           ┌──────────┐
          │       RELEASE             │ dragging │
          └───────────────────────────└──────────┘
             release resolves placement (snap or bench) and returns to selected

     any state: INSPECT(id, part) → inspecting (modal); CANCEL → restore origin
```

| State | Meaning | Allowed events |
|---|---|---|
| `idle` | nothing hovered/selected | hover, grab-direct, inspect |
| `hover` | candidate highlighted by mouse/hand cursor | press, deselect, pointer-out |
| `selected` | logical selection; keyboard/UI actions target it; release destination | grab, inspect, deselect, action |
| `grabbed` | pointer down / pinch closed; body is kinematic, origin saved | move, release, cancel |
| `dragging` | moved beyond 8 mm | move, release, cancel |
| `inspecting` | component detail card open | close, select |

Placement resolution (snap zone vs. bench clamp) happens in the store on `release`; there is no artificial
placing animation and therefore no separate `snapping`/`placed` machine state.

Invariants:
- Exactly one `grabbedId`; a second grab is ignored until release.
- Release always resolves to a legal pose: snap pose if valid, else bench plane clamp.
- `CANCEL` restores the origin and releases any snap preview.
- A grab never mutates chemistry; it only changes apparatus transform/placement.
- Selecting a sub-part (e.g. burette stopcock) never picks up the whole apparatus.

---

## 5. Chemistry model

- Analyte: **25.00 mL HCl of unknown concentration** (0.080–0.160 M).
- Titrant: **0.1000 M NaOH**, 50.00 mL burette.
- Indicator: phenolphthalein, 3 drops; colourless below pH 8.2, faint pink at endpoint,
  magenta with increasing excess base.
- 1:1 stoichiometry: `C(HCl) = C(NaOH) × V(titre) / V(aliquot)`.
- pH from strong-acid/strong-base excess:
  `[H+] = (nHCl − nNaOH)/V`, `[OH−] = (nNaOH − nHCl)/V`, clamped to pH 0–14.
- Indicator colour is a function of pH and indicator presence only.
- Conservation: total `volumeMl` and total `hclMoles`, `naohMoles`, `indicatorMl` over all
  containers are invariant across transfers (within floating-point epsilon).
- Drop size 0.05 mL; stream 2.0 mL/s; dropwise 0.20 mL/s. The flow loop requests a volume for
  the elapsed time; `dispenseTitrant` clamps to the burette and updates flask + reading atomically.

Workflow steps (gated, resettable):

1. **Arrange** — burette in the retort clamp, flask in the titration bay.
2. **Transfer analyte** — pipette 25.00 mL from the unknown HCl bottle to the flask.
3. **Indicator** — add 3 drops phenolphthalein.
4. **Fill burette** — transfer 50.00 mL NaOH from the stock bottle; reading set to 0.00.
5. **Titrate** — open stopcock, reach a persistent pink endpoint, close stopcock.
6. **Record** — capture final reading; titre = final − initial.
7. **Calculate** — derive unknown concentration, show workup and accuracy grade.

---

## 6. Performance criteria

Target: ≥ 45 fps at 1280×720 on integrated Intel Iris Xe / AMD Vega graphics; usable at 30 fps
with the Performance preset.

| Budget | Target | Implementation |
|---|---|---|
| Draw calls | ≤ 190 (measured 175) | shared materials, invisible raycast proxies, no external models |
| Triangles | ≤ 25k (measured 12.1k) | low-segment lathes/cylinders, no per-frame geometry allocation |
| Textures | 0 external (procedural) | gradients via materials/vertex colours |
| Shadow map | 1024, one shadow light | disabled in Performance preset |
| DPR | 1.0–1.75 adaptive | quality governor downgrades after sustained < 34 fps |
| Hand inference | ≤ 1 per new camera frame | frame timestamp guard, optional every-2nd-frame |
| React updates | liquid/flow ≤ 12 Hz, hover ≤ 15 Hz | store actions throttled; Three.js animates at frame rate |
| Disposal | all geometries/materials disposed | `useMemo` + R3F auto-dispose; no hot-loop allocations |

Graceful degradation:
1. Quality auto-drops high → balanced → performance on sustained low FPS.
2. Performance disables shadows, lowers DPR to 1, lowers camera request to 640×480, skips
   alternate camera frames, reduces shadow-casting meshes.
3. If WebGL context creation fails, a fallback screen offers a 2D guided "bench mode" and
   explains how to enable hardware acceleration. If MediaPipe fails, mouse/keyboard/touch remain
   fully functional and the HUD says so.

## 7. Testing criteria

Automated (Vitest + Testing Library, no GPU required):

| Suite | Required assertions |
|---|---|
| Gesture classification | open/fist/point/pinch/roll on synthetic 21-landmark hands; realistic fist-like pinch; mirrored coordinates; sensitivity profiles; pinch calibration |
| Gesture debouncing | N-frame hold, edge fires once, cooldown, pinch hysteresis, pinch release debounce, tracking-dropout grace/reacquire, fist latch, two-hand stability |
| Object selection | hover→select, part vs apparatus selection, empty-space miss |
| Pick-up/release | state machine transitions, origin restore, invalid transitions ignored |
| Movement | bench-plane clamping, scale/zoom mapping, wrist rotation yaw |
| Placement | nearest compatible snap within radius, wrong/occupied slot rejection, bench fallback |
| Mouse/keyboard fallback | DOM interaction selects and moves equipment; shortcuts invoke actions; full workflow without camera |
| Chemistry | pH before/at/after equivalence, indicator thresholds, titre, concentration, error/grade |
| Volume conservation | sum of volumes and solutes invariant over randomized transfer sequences; burette clamp; no negative volumes |
| Camera failure | permission denied, no mediaDevices, tracker creation failure, stream ended → recoverable error state, no footage transmitted |
| Workflow | step gating, endpoint detection, reset restores exact initial state |

Manual/browser validation: production build served on localhost, Chrome/Edge, real webcam pass
for each gesture, plus mouse-only and touch-emulated runs. Results recorded in `docs/TESTING.md`.

## 8. Milestones

| # | Milestone | Exit criteria |
|---|---|---|
| 1 | 3D laboratory | bench, room, stand, all apparatus rendered with solid geometry |
| 2 | Hand tracking | camera permission UI, MediaPipe local inference, status/failure states, overlay |
| 3 | Gesture engine | six gestures classified, debounced, configurable, unit-tested |
| 4 | Manipulation | select, pick, move, rotate, release, snap, physics settle, inspect |
| 5 | Titration | all seven steps work with mouse/keyboard and gesture commands |
| 6 | Chemistry/liquid | authoritative transfer engine, pH/colour, conservation tests |
| 7 | Fallbacks | every essential action available by mouse, keyboard and touch |
| 8 | Optimise/test | typecheck, unit tests, production build, browser and performance check |
