import {
  Camera,
  Droplets,
  Hand,
  Keyboard,
  Maximize2,
  MousePointer2,
  Move3d,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../interaction/keyboard';
import { Kbd, Pill, SectionLabel } from './primitives';

const GESTURES = [
  {
    icon: <Hand size={18} />,
    name: 'Pinch',
    keys: 'thumb + index',
    description:
      'Grab the apparatus under the hand cursor, carry it, and release to place it. Use Calibrate in the camera panel if your pinch is not recognised.',
  },
  {
    icon: <Hand size={18} />,
    name: 'Open hand',
    keys: 'five fingers',
    description: 'Release a held apparatus. It snaps to the nearest valid clamp, bay or bench position.',
  },
  {
    icon: <MousePointer2 size={18} />,
    name: 'Point',
    keys: 'index finger',
    description: 'Dwell on a piece of equipment to select it, or on a highlighted control to activate it.',
  },
  {
    icon: <Sparkles size={18} />,
    name: 'Fist',
    keys: 'closed hand',
    description:
      'Operate the selection: fill the burette, open/close the stopcock, pipette the aliquot, add indicator, or record/calculate.',
  },
  {
    icon: <Move3d size={18} />,
    name: 'Wrist twist',
    keys: 'rotate hand',
    description: 'Rotate a selected or held apparatus around its vertical axis.',
  },
  {
    icon: <Maximize2 size={18} />,
    name: 'Two hands',
    keys: 'spread / close',
    description: 'Zoom the laboratory view in and out while both hands are visible.',
  },
];

const MOUSE_STEPS = [
  'Click equipment to select it. Click the burette stopcock to open or close the flow.',
  'Drag equipment to move it. Drop near the retort clamp or titration bay to snap into place.',
  'Double-click any part for its description. Drag empty space to orbit, scroll to zoom.',
  'On touch screens, tap to select, drag with one finger, and pinch with two fingers to zoom.',
];

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6" data-gesture-ui>
      <button
        type="button"
        aria-label="Close help"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-lab-950/96 text-lab-100 shadow-panel">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <SectionLabel>LabBase help</SectionLabel>
              <Pill tone="amber">No VR needed</Pill>
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">Hands, mouse, keyboard or touch</h2>
            <p className="mt-1 text-[11px] text-lab-300">
              Every experiment action works without a webcam. Camera frames are processed on this device only.
            </p>
          </div>
          <button
            type="button"
            data-gesture-target
            onClick={onClose}
            aria-label="Close help"
            className="rounded-lg p-1.5 text-lab-300 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 lab-scroll">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <SectionLabel>Gesture guide</SectionLabel>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {GESTURES.map((gesture) => (
                  <div
                    key={gesture.name}
                    className="rounded-xl border border-white/8 bg-white/[0.035] p-3 transition hover:border-lab-400/25 hover:bg-lab-400/[0.06]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-lab-400/25 bg-lab-400/10 text-lab-200">
                        {gesture.icon}
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-white">{gesture.name}</p>
                        <p className="text-[9px] uppercase tracking-wider text-lab-400">{gesture.keys}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-lab-300">{gesture.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <SectionLabel>Mouse & touch</SectionLabel>
                <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-lab-200">
                    <MousePointer2 size={14} /> Full parity, no camera required
                  </div>
                  <ul className="space-y-1.5 text-[10px] leading-relaxed text-lab-300">
                    {MOUSE_STEPS.map((step) => (
                      <li key={step} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lab-400" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <SectionLabel>Chemistry refresher</SectionLabel>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-lab-400">Reaction</p>
                    <p className="mt-1 font-mono text-[11px] text-lab-100">HCl + NaOH → NaCl + H₂O</p>
                    <p className="mt-1 text-[9px] text-lab-400">1:1 mole ratio</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-lab-400">At equivalence</p>
                    <p className="mt-1 font-mono text-[11px] text-lab-100">n(HCl) = n(NaOH)</p>
                    <p className="mt-1 text-[9px] text-lab-400">pH 7 for strong/strong</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-lab-400">Indicator</p>
                    <p className="mt-1 font-mono text-[11px] text-lab-100">pH &gt; 8.2</p>
                    <p className="mt-1 text-[9px] text-lab-400">first persistent pink</p>
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 font-mono text-[11px] text-amber-100">
                  C(HCl) = C(NaOH) × V(titre) ÷ V(aliquot)
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Keyboard size={14} className="text-lab-300" />
                <SectionLabel>Keyboard shortcuts</SectionLabel>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border border-white/8">
                <table className="w-full text-left text-[10px]">
                  <tbody>
                    {KEYBOARD_SHORTCUTS.map((shortcut) => (
                      <tr key={shortcut.keys} className="border-b border-white/5 last:border-0">
                        <td className="w-24 whitespace-nowrap px-2 py-1.5 align-top">
                          <span className="flex flex-wrap gap-1">
                            {shortcut.keys.split(' / ').map((key) => (
                              <span key={key}>
                                <Kbd>{key}</Kbd>
                              </span>
                            ))}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-lab-300">{shortcut.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-xl border border-lab-400/20 bg-lab-400/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-lab-100">
                  <ShieldCheck size={14} /> Privacy & performance
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-lab-300">
                  Webcam frames and hand landmarks never leave this browser. MediaPipe runs locally using the
                  bundled model and WASM. If your laptop struggles, switch to the Performance preset in settings.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-lab-100">
                  <Camera size={14} /> Camera not starting?
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-lab-300">
                  Use Chrome or Edge on <span className="font-mono text-lab-200">localhost</span>. Allow camera
                  permission in site settings. If it still fails, continue with mouse and keyboard — the full
                  experiment remains available.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-lab-100">
                  <Droplets size={14} /> Endpoint tips
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-lab-300">
                  Use stream until the pink flashes and fades, then switch to dropwise. Close the stopcock at the
                  first persistent pale-pink colour. A single extra drop can overshoot.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 px-5 py-3 text-[10px] text-lab-400">
          <span className="hidden items-center gap-1.5 sm:flex">
            <Hand size={13} /> Tip: adjust gesture sensitivity in the camera panel.
          </span>
          <button
            type="button"
            data-gesture-target
            onClick={onClose}
            className="ml-auto rounded-lg border border-lab-400/30 bg-lab-400/10 px-3 py-1.5 text-[11px] font-semibold text-lab-100 hover:bg-lab-400/20"
          >
            Back to the lab
          </button>
        </div>
      </div>
    </div>
  );
}
