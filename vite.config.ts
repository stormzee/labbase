import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    watch: {
      // Editor atomic-write scratch directories can transiently lock files on Windows.
      ignored: ['**/*.tmpdir/**', '**/*.tmp/**'],
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@mediapipe')) return 'mediapipe';
          if (id.includes('@react-three/rapier') || id.includes('@dimforge')) return 'physics';
          if (id.includes('@react-three')) return 'r3f';
          if (id.includes('three')) return 'three';
          if (id.includes('react') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
