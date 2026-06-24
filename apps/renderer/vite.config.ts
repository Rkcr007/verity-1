import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Renderer build (architecture §10).
 *
 * `base: './'` makes the production bundle load from a relative path so Electron
 * can serve it via loadFile(). The dev server runs on a fixed port the desktop
 * dev launcher waits for. Vite compiles workspace TS source directly (the
 * "internal source packages" pattern, resolution X-04).
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
});
