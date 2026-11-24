import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import * as THREE from 'three';
import { QUALITY_PRESETS } from '../domain/constants';
import { useLabStore } from '../store/labStore';
import { useSettingsStore } from '../store/settingsStore';
import type { GestureFrame } from '../gestures/types';
import { ApparatusLayer } from './apparatus/ApparatusLayer';
import { AdaptiveQuality, FlowTicker, RenderStatsProbe } from './FlowTicker';
import { GestureBridge, type ControlsLike } from './interaction/GestureBridge';
import { PointerController } from './interaction/PointerController';
import { Lighting } from './Lighting';
import { PhysicsLab } from './physics/PhysicsLab';
import { Room } from './Room';
import { SnapMarkers } from './SnapMarkers';
import { Workbench } from './Workbench';

type OrbitHandle = ComponentRef<typeof OrbitControls>;

/** Exposes camera projection only when ?debug is present, for automated interaction checks. */
function DebugProjectionBridge() {
  const { camera, gl } = useThree();
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const debugWindow = window as unknown as {
      __labDebug?: {
        project: (point: [number, number, number]) => { x: number; y: number };
        stats: () => {
          calls: number;
          triangles: number;
          geometries: number;
          textures: number;
          programs: number;
        };
      };
    };
    debugWindow.__labDebug = {
      project: (point) => {
        const projected = new THREE.Vector3(...point).project(camera);
        return { x: projected.x, y: projected.y };
      },
      stats: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
      }),
    };
    return () => {
      delete debugWindow.__labDebug;
    };
  }, [camera, gl]);
  return null;
}

interface LabSceneProps {
  frameRef: RefObject<GestureFrame | null>;
  compact?: boolean;
}

export function LabScene({ frameRef, compact = false }: LabSceneProps) {
  const quality = useSettingsStore((state) => state.quality);
  const preset = QUALITY_PRESETS[quality];
  const grabbed = useLabStore((state) => Boolean(state.interaction.grabbedId));
  const interactiveRootRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitHandle>(null);
  const cameraPosition: [number, number, number] = compact
    ? [0.2, 2.4, 4.4]
    : [0.45, 1.98, 2.85];
  const controlsTarget: [number, number, number] = compact ? [0, 1.0, 0] : [0, 1.08, 0];

  return (
    <Canvas
      className="lab-canvas"
      dpr={[...preset.dpr] as [number, number]}
      shadows={preset.shadows}
      camera={{ position: cameraPosition, fov: compact ? 50 : 42, near: 0.05, far: 30 }}
      gl={{
        antialias: quality !== 'performance',
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.28;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-lab-950 p-8 text-center text-lab-200">
          WebGL could not start. Enable hardware acceleration or try another browser; the guided checklist
          and controls remain available.
        </div>
      }
    >
      <color attach="background" args={['#0a1b18']} />
      <fog attach="fog" args={['#0a1b18', 5.2, 12]} />
      <Suspense fallback={null}>
        <Room />
        <Workbench />
        <SnapMarkers />
        <Lighting />
        <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <PhysicsLab />
          <ApparatusLayer interactiveRootRef={interactiveRootRef} />
        </Physics>
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={controlsTarget}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.8}
        minDistance={1.25}
        maxDistance={4.6}
        minPolarAngle={0.22}
        maxPolarAngle={Math.PI / 2.02}
        enabled={!grabbed}
      />
      <FlowTicker />
      <AdaptiveQuality />
      <RenderStatsProbe />
      <GestureBridge
        frameRef={frameRef}
        interactiveRootRef={interactiveRootRef}
        controlsRef={controlsRef as unknown as RefObject<ControlsLike | null>}
      />
      <PointerController interactiveRootRef={interactiveRootRef} />
      <DebugProjectionBridge />
    </Canvas>
  );
}
