import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { useKeyboardShortcuts } from './interaction/useKeyboardShortcuts';
import { useLabStore } from './store/labStore';
import { useSettingsStore } from './store/settingsStore';
import { useUiStore } from './store/uiStore';
import { useHandTracking } from './tracking/useHandTracking';
import { ActionDock } from './ui/ActionDock';
import { CameraPanel } from './ui/CameraPanel';
import { EquipmentPanel } from './ui/EquipmentPanel';
import { ExperimentPanel } from './ui/ExperimentPanel';
import { GestureCursor } from './ui/GestureCursor';
import { HelpOverlay } from './ui/HelpOverlay';
import { InspectorModal } from './ui/InspectorModal';
import { MeasurementPanel } from './ui/MeasurementPanel';
import { MobileNav, MobileSheet, type MobileTab } from './ui/MobileNav';
import { SceneErrorBoundary } from './ui/SceneErrorBoundary';
import { SettingsPopover } from './ui/SettingsPopover';
import { ToastHost } from './ui/ToastHost';
import { TopBar } from './ui/TopBar';
import { useMediaQuery } from './ui/useMediaQuery';

const LabScene = lazy(() =>
  import('./scene/LabScene').then((module) => ({ default: module.LabScene })),
);

function SceneLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-lab-950 text-lab-300">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
        <FlaskConical size={22} />
      </div>
      <p className="flex items-center gap-2 text-[11px] font-medium tracking-wide">
        <Loader2 size={13} className="animate-spin" /> Preparing the 3D laboratory…
      </p>
    </div>
  );
}

export default function App() {
  const tracking = useHandTracking();
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const reset = useLabStore((state) => state.reset);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
    return () => document.documentElement.classList.remove('reduce-motion');
  }, [reducedMotion]);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const debugWindow = window as unknown as {
      __labFrameRef?: typeof tracking.frameRef;
      __uiStore?: typeof useUiStore;
      __settingsStore?: typeof useSettingsStore;
    };
    debugWindow.__labFrameRef = tracking.frameRef;
    debugWindow.__uiStore = useUiStore;
    debugWindow.__settingsStore = useSettingsStore;
  }, [tracking.frameRef]);

  const toggleHelp = useCallback(() => {
    setHelpOpen((open) => !open);
    setSettingsOpen(false);
  }, []);
  const toggleSettings = useCallback(() => {
    setSettingsOpen((open) => !open);
    setHelpOpen(false);
  }, []);
  const closeMobile = useCallback(() => setMobileTab(null), []);

  const handleReset = useCallback(() => {
    reset();
    setHelpOpen(false);
    setSettingsOpen(false);
    setMobileTab(null);
  }, [reset]);

  useKeyboardShortcuts({
    tracking,
    helpOpen,
    settingsOpen,
    mobileOpen: mobileTab !== null,
    onToggleHelp: toggleHelp,
    onToggleSettings: toggleSettings,
    onCloseMobile: closeMobile,
  });

  return (
    <div className="relative h-dvh min-h-[520px] w-full overflow-hidden bg-lab-950 text-lab-100">
      <div className="absolute inset-0">
        <SceneErrorBoundary>
          <Suspense fallback={<SceneLoading />}>
            <LabScene frameRef={tracking.frameRef} compact={!isDesktop} />
          </Suspense>
        </SceneErrorBoundary>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,transparent_0%,rgba(3,10,9,0.14)_58%,rgba(3,10,9,0.6)_100%)]" />

      <TopBar
        status={tracking.status}
        helpOpen={helpOpen}
        settingsOpen={settingsOpen}
        onHelp={toggleHelp}
        onSettings={toggleSettings}
        onReset={handleReset}
      />

      {isDesktop ? (
        <>
          <div className="pointer-events-none fixed bottom-3 left-3 top-[76px] z-30 flex w-[300px] flex-col gap-2 overflow-y-auto pr-1 lab-scroll xl:w-[324px]">
            <ExperimentPanel />
            <CameraPanel tracking={tracking} />
          </div>
          <div className="pointer-events-none fixed bottom-3 right-3 top-[76px] z-30 flex w-[300px] flex-col gap-2 xl:w-[324px]">
            <MeasurementPanel />
            <EquipmentPanel />
          </div>
        </>
      ) : (
        <>
          <MobileNav active={mobileTab} onChange={setMobileTab} />
          <MobileSheet active={mobileTab} onClose={closeMobile}>
            {mobileTab === 'experiment' && <ExperimentPanel />}
            {mobileTab === 'equipment' && <EquipmentPanel />}
            {mobileTab === 'measure' && <MeasurementPanel />}
            {mobileTab === 'camera' && <CameraPanel tracking={tracking} />}
          </MobileSheet>
        </>
      )}

      <ActionDock />
      <GestureCursor frameRef={tracking.frameRef} active={tracking.status === 'tracking'} />

      <ToastHost />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SettingsPopover open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <InspectorModal />
    </div>
  );
}
