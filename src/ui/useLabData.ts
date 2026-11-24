import { useEffect, useMemo, useState } from 'react';
import { analyseSolution } from '../domain/chemistry';
import { deriveProgress } from '../domain/titration';
import { getDeliveredMl, useLabStore } from '../store/labStore';

export function useProgress() {
  const placements = useLabStore((state) => state.placements);
  const experiment = useLabStore((state) => state.experiment);
  const flow = useLabStore((state) => state.flow);
  const indicatorMl = useLabStore((state) => state.containers.flask.indicatorMl);
  return useMemo(
    () =>
      deriveProgress({
        buretteSnappedTo: placements.burette.snappedTo,
        flaskSnappedTo: placements.flask.snappedTo,
        aliquotTransferred: experiment.aliquotTransferred,
        flaskIndicatorMl: indicatorMl,
        buretteFilled: experiment.buretteFilled,
        endpointReached: experiment.endpointReached,
        flow,
        readings: experiment.readings,
        result: experiment.result,
      }),
    [placements, experiment, flow, indicatorMl],
  );
}

export function useFlaskAnalysis() {
  const flask = useLabStore((state) => state.containers.flask);
  return useMemo(() => analyseSolution(flask), [flask]);
}

export function useReading() {
  const startVolume = useLabStore((state) => state.buretteStartVolumeMl);
  const volume = useLabStore((state) => state.containers.burette.volumeMl);
  const initial = useLabStore((state) => state.experiment.readings.initialMl);
  if (startVolume === null || initial === null) return null;
  return initial + Math.max(0, startVolume - volume);
}

export function useDelivered() {
  return useLabStore((state) => getDeliveredMl(state));
}

export function useElapsedSeconds() {
  const startedAt = useLabStore((state) => state.startedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
