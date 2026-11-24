import { Beaker, Camera, FlaskConical, LineChart, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './primitives';

export type MobileTab = 'experiment' | 'equipment' | 'measure' | 'camera';

const TABS: Array<{ id: MobileTab; label: string; icon: ReactNode }> = [
  { id: 'experiment', label: 'Lab', icon: <FlaskConical size={17} /> },
  { id: 'equipment', label: 'Equipment', icon: <Beaker size={17} /> },
  { id: 'measure', label: 'Data', icon: <LineChart size={17} /> },
  { id: 'camera', label: 'Camera', icon: <Camera size={17} /> },
];

export function MobileNav({
  active,
  onChange,
}: {
  active: MobileTab | null;
  onChange: (tab: MobileTab | null) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-lab-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-gesture-target
            aria-pressed={active === tab.id}
            onClick={() => onChange(active === tab.id ? null : tab.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-2 text-[9px] font-semibold transition',
              active === tab.id ? 'text-amber-300' : 'text-lab-400 hover:text-lab-200',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function MobileSheet({
  active,
  onClose,
  children,
}: {
  active: MobileTab | null;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!active) return null;
  return (
    <div className="fixed inset-x-2 bottom-[256px] z-[45] flex max-h-[36vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-lab-950/95 shadow-panel backdrop-blur-xl lg:hidden">
      <div className="relative flex shrink-0 items-center justify-center py-2">
        <span className="h-1 w-9 rounded-full bg-white/15" />
        <button
          type="button"
          aria-label="Close panel"
          data-gesture-target
          onClick={onClose}
          className="absolute right-2 top-1.5 rounded-md p-1 text-lab-400 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 lab-scroll">{children}</div>
    </div>
  );
}
