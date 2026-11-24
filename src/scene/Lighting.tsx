import { useSettingsStore } from '../store/settingsStore';

export function Lighting() {
  const quality = useSettingsStore((state) => state.quality);
  const shadows = quality !== 'performance';
  return (
    <group>
      <ambientLight intensity={0.95} color="#d7eee8" />
      <hemisphereLight args={['#e2f7f1', '#0b1a17', 1.2]} />
      <directionalLight
        castShadow={shadows}
        position={[2.4, 3.6, 2.8]}
        intensity={2.4}
        color="#fff4dd"
        shadow-mapSize-width={quality === 'high' ? 1024 : 768}
        shadow-mapSize-height={quality === 'high' ? 1024 : 768}
        shadow-camera-near={0.5}
        shadow-camera-far={9}
        shadow-camera-left={-2.8}
        shadow-camera-right={2.8}
        shadow-camera-top={2.6}
        shadow-camera-bottom={-1.6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
      />
      <directionalLight position={[-2.6, 2.4, 0.8]} intensity={0.75} color="#8fd3ca" />
      <directionalLight position={[0, 1.8, 3.4]} intensity={0.5} color="#fff1d8" />
      <pointLight position={[-0.4, 2.4, 0.5]} intensity={1.5} distance={4.4} decay={2} color="#ffe9c4" />
      <pointLight position={[1.5, 1.8, -0.6]} intensity={0.8} distance={3.6} decay={2} color="#bfe6ff" />
      <pointLight position={[0, 1.6, 0.7]} intensity={0.7} distance={2.8} decay={2} color="#f3fff9" />
    </group>
  );
}
