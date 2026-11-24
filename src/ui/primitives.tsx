import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export function Panel({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'aside';
}) {
  return (
    <Tag
      data-gesture-ui
      className={cn(
        'pointer-events-auto rounded-2xl border border-white/10 bg-lab-950/80 text-lab-100 shadow-panel backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.2em] text-lab-300/80', className)}>
      {children}
    </p>
  );
}

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'teal' | 'amber' | 'rose' | 'green';
  className?: string;
}) {
  const tones = {
    neutral: 'border-white/10 bg-white/5 text-lab-200',
    teal: 'border-lab-400/30 bg-lab-400/10 text-lab-200',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    green: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = 'teal', pulse = false }: { tone?: 'teal' | 'amber' | 'rose' | 'muted'; pulse?: boolean }) {
  const colors = {
    teal: 'bg-lab-300',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    muted: 'bg-lab-500',
  } as const;
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', colors[tone])} />}
      <span className={cn('relative h-2 w-2 rounded-full', colors[tone])} />
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-lab-200">
      {children}
    </kbd>
  );
}

export function IconButton({
  label,
  children,
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-gesture-target
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border text-lab-200 transition',
        'border-white/10 bg-white/5 hover:border-lab-400/40 hover:bg-lab-400/10 hover:text-white',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-300',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active && 'border-amber-400/40 bg-amber-400/15 text-amber-300',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ActionButton({
  children,
  tone = 'ghost',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'primary' | 'ghost' | 'danger' | 'soft';
}) {
  const tones = {
    primary:
      'border-amber-400/50 bg-amber-400/90 text-lab-950 shadow-[0_8px_24px_-8px_rgba(242,184,75,0.7)] hover:bg-amber-300',
    ghost:
      'border-white/10 bg-white/5 text-lab-100 hover:border-lab-400/40 hover:bg-lab-400/10',
    soft: 'border-lab-400/25 bg-lab-400/10 text-lab-100 hover:bg-lab-400/20',
    danger: 'border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  } as const;
  return (
    <button
      type="button"
      data-gesture-target
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold tracking-wide transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-300',
        'disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-lab-400 disabled:shadow-none',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/10', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-lab-400 to-amber-400 transition-[width] duration-500"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}
