// Dev launcher for the desktop shell.
// 1) Starts the renderer Vite dev server.
// 2) Builds main + preload in watch mode (tsup).
// 3) Waits for the renderer, then launches Electron.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = resolve(__dirname, '..');
const RENDERER_DIR = resolve(__dirname, '../../renderer');

const RENDERER_URL = process.env.VERITY_RENDERER_URL ?? 'http://localhost:5173';

/** @param {string} url */
async function isRendererUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

/** @param {import('node:child_process').ChildProcess | null} child */
function killChild(child) {
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }
}

async function waitForRenderer(url, timeoutMs = 60000) {
  const start = Date.now();
  process.stdout.write(`Waiting for renderer at ${url}…\n`);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        process.stdout.write('Renderer ready.\n');
        return;
      }
    } catch {
      // not up yet
    }
    await delay(400);
  }
  throw new Error(
    `Renderer dev server not reachable at ${url} after ${timeoutMs / 1000}s`,
  );
}

async function main() {
  /** @type {import('node:child_process').ChildProcess | null} */
  let renderer = null;

  if (await isRendererUp(RENDERER_URL)) {
    process.stdout.write(`Reusing renderer already running at ${RENDERER_URL}\n`);
  } else {
    renderer = spawn('pnpm', ['exec', 'vite'], {
      cwd: RENDERER_DIR,
      stdio: 'inherit',
    });
  }

  const tsup = spawn('pnpm', ['exec', 'tsup', '--watch'], {
    cwd: DESKTOP_DIR,
    stdio: 'inherit',
  });

  // Give both processes a moment to start, then wait for Vite.
  await delay(1500);
  await waitForRenderer(RENDERER_URL);

  process.stdout.write('Launching Electron…\n');
  const electron = spawn('pnpm', ['exec', 'electron', '.'], {
    cwd: DESKTOP_DIR,
    stdio: 'inherit',
    env: { ...process.env, VERITY_RENDERER_URL: RENDERER_URL },
  });

  const cleanup = () => {
    killChild(renderer);
    killChild(tsup);
    killChild(electron);
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await once(electron, 'exit');
  killChild(renderer);
  killChild(tsup);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
