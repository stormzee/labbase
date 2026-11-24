import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandTrackingApi } from '../tracking/useHandTracking';
import { ActionDock } from '../ui/ActionDock';
import { CameraPanel } from '../ui/CameraPanel';
import { useLabStore } from '../store/labStore';
import { useSettingsStore } from '../store/settingsStore';

afterEach(cleanup);

beforeEach(() => {
  useLabStore.getState().reset(4242);
});

function fakeTracking(overrides: Partial<HandTrackingApi> = {}): HandTrackingApi {
  return {
    videoRef: { current: null },
    frameRef: { current: null },
    status: 'denied',
    failure: {
      title: 'Camera permission denied',
      message: 'Permission denied',
      hint: 'Allow camera access and retry, or continue with mouse and keyboard.',
      code: 'denied',
    },
    stats: {
      fps: 0,
      detectMs: 0,
      frames: 0,
      handCount: 0,
      delegate: 'GPU',
      pose: 'none',
      pinch: false,
      pinchRatio: 0,
      pinchThreshold: 0.41,
      pointing: false,
      hasHand: false,
    },
    start: vi.fn(async () => {}),
    stop: vi.fn(),
    retry: vi.fn(async () => {}),
    clearFailure: vi.fn(),
    ...overrides,
  };
}

describe('mouse and keyboard fallback surfaces', () => {
  it('provides each essential experiment action as a clickable control', () => {
    render(<ActionDock />);
    expect(screen.getAllByRole('button', { name: /Arrange apparatus/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Fill/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Indicator/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Record/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Calculate/i })).toBeTruthy();
  });

  it('pipettes an aliquot from the action dock without a camera', () => {
    render(<ActionDock />);
    fireEvent.click(screen.getByRole('button', { name: /^Pipette$/ }));
    expect(useLabStore.getState().containers.flask.volumeMl).toBeCloseTo(25, 6);
    expect(useLabStore.getState().experiment.aliquotTransferred).toBe(true);
  });

  it('shows a recoverable camera permission failure with a no-camera path', () => {
    const tracking = fakeTracking();
    render(<CameraPanel tracking={tracking} />);
    expect(screen.getByText('Camera permission denied')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Continue without camera/i }));
    expect(tracking.stop).toHaveBeenCalled();
    expect(tracking.clearFailure).toHaveBeenCalled();
  });

  it('offers a retry after camera failure', () => {
    const tracking = fakeTracking();
    render(<CameraPanel tracking={tracking} />);
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(tracking.retry).toHaveBeenCalled();
  });

  it('keeps camera start available when idle', () => {
    const tracking = fakeTracking({ failure: null, status: 'idle' });
    render(<CameraPanel tracking={tracking} />);
    fireEvent.click(screen.getByRole('button', { name: /Enable camera/i }));
    expect(tracking.start).toHaveBeenCalled();
  });

  it('calibrates pinch thresholds from live samples', async () => {
    useSettingsStore.getState().resetSettings();
    const base = fakeTracking({ failure: null, status: 'tracking' });
    const tracking: HandTrackingApi = {
      ...base,
      stats: { ...base.stats, hasHand: true, pinchRatio: 0.32, pinchThreshold: 0.41 },
      frameRef: {
        current: {
          hasHand: true,
          rawPose: 'open',
          pinchRatio: 0.32,
        } as never,
      },
    };
    render(<CameraPanel tracking={tracking} />);
    fireEvent.click(screen.getByRole('button', { name: /Calibrate/i }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2850));
    });
    expect(useSettingsStore.getState().gesture.pinchCalibration).toBeCloseTo(0.32, 2);
    expect(screen.getByText(/Calibrated to/i)).toBeTruthy();
    act(() => useSettingsStore.getState().resetSettings());
  });
});
