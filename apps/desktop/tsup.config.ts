import { defineConfig } from 'tsup';

/**
 * Builds the Electron main process and preload to CommonJS (resolution X-04).
 *
 * Workspace TS source (@verity/core, @verity/local-persistence) is bundled in;
 * `electron` and the native `better-sqlite3` binding are kept external so they
 * resolve from node_modules at runtime. Output extensions are explicit so
 * Electron's `main` field and the preload path stay stable.
 */
export default defineConfig({
  entry: {
    'main/main': 'src/main/main.ts',
    'preload/preload': 'src/preload/preload.ts',
  },
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  outDir: 'out',
  outExtension: () => ({ js: '.cjs' }),
  external: ['electron', 'better-sqlite3'],
  sourcemap: true,
  clean: true,
  splitting: false,
  bundle: true,
});
