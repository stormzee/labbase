import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SceneErrorBoundaryState {
  error: Error | null;
}

/** Graceful fallback when WebGL or the physics runtime cannot initialise. */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Lab scene failed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full w-full items-center justify-center bg-lab-950 p-8">
        <div className="max-w-md rounded-2xl border border-rose-400/25 bg-rose-500/10 p-5 text-center text-rose-100">
          <AlertTriangle className="mx-auto mb-2 text-rose-300" size={26} />
          <h2 className="text-base font-bold">The 3D laboratory could not start</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-rose-100/75">
            Enable WebGL / hardware acceleration in your browser and reload. The guided instructions and
            measurement panels remain usable, but apparatus manipulation needs the 3D view.
          </p>
          <p className="mt-2 break-words rounded-lg bg-black/20 p-2 font-mono text-[9px] text-rose-100/60">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20"
          >
            <RefreshCw size={13} /> Reload
          </button>
        </div>
      </div>
    );
  }
}
