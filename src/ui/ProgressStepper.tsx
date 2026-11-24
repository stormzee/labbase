import { Check } from 'lucide-react';
import { STEP_META, STEP_ORDER } from '../domain/constants';
import type { Progress } from '../domain/titration';
import { cn } from './primitives';

export function ProgressStepper({ progress, compact = false }: { progress: Progress; compact?: boolean }) {
  const currentIndex = progress.currentStep ? STEP_META[progress.currentStep].index : STEP_ORDER.length;
  return (
    <div className={cn('flex flex-col gap-1.5', compact ? 'items-center' : 'w-full')}>
      <div className="flex items-center">
        {STEP_ORDER.map((step, index) => {
          const done = progress.steps[step];
          const current = currentIndex === index;
          return (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition',
                  done && 'border-lab-400/50 bg-lab-400/20 text-lab-200',
                  current && !done && 'border-amber-400/70 bg-amber-400/20 text-amber-200 ring-4 ring-amber-400/10',
                  !done && !current && 'border-white/10 bg-white/5 text-lab-400',
                )}
                title={STEP_META[step].title}
                aria-label={`${STEP_META[step].title}${done ? ' complete' : current ? ' current' : ' pending'}`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : index + 1}
              </div>
              {index < STEP_ORDER.length - 1 && (
                <div
                  className={cn(
                    'h-px w-5 xl:w-8',
                    progress.steps[STEP_ORDER[index + 1]] ? 'bg-lab-400/60' : 'bg-white/10',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-lab-300">
          {progress.currentStep ? STEP_META[progress.currentStep].title : 'Experiment complete'}
        </p>
      )}
    </div>
  );
}
