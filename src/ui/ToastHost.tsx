import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useLabStore, type Toast } from '../store/labStore';
import { cn } from './primitives';

const ICONS = {
  success: <CheckCircle2 size={16} />,
  warning: <AlertTriangle size={16} />,
  error: <XCircle size={16} />,
  info: <Info size={16} />,
} as const;

const TONES = {
  success: 'border-emerald-400/30 bg-emerald-950/80 text-emerald-100',
  warning: 'border-amber-400/35 bg-amber-950/80 text-amber-100',
  error: 'border-rose-400/35 bg-rose-950/80 text-rose-100',
  info: 'border-lab-400/30 bg-lab-900/85 text-lab-100',
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useLabStore((state) => state.dismissToast);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), 5200);
    return () => window.clearTimeout(id);
  }, [dismiss, toast.id]);
  return (
    <div
      role="status"
      className={cn(
        'toast-item pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-panel backdrop-blur-xl',
        TONES[toast.kind],
      )}
    >
      <span className="mt-0.5 shrink-0">{ICONS[toast.kind]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold leading-snug">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-[10px] leading-relaxed opacity-80">{toast.message}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(toast.id)}
        className="rounded p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function ToastHost() {
  const toasts = useLabStore((state) => state.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[76px] z-[65] flex w-[min(92vw,390px)] -translate-x-1/2 flex-col gap-2 md:top-[82px]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
