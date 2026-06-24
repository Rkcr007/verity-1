// Dev launcher for the desktop shell.
// 1) Builds main + preload in watch mode (tsup).
// 2) Waits for the renderer Vite dev server.
// 3) Launches Electron pointing at the dev server, restarting on main rebuilds.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const RENDERER_URL = process.env.VERITY_RENDERER_URL ?? 'http://localhost:5173';

async function waitForRenderer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200) return;
    } catch {
      // not up yet
    }
    await delay(400);
  }
  throw new Error(`Renderer dev server not reachable at ${url}`);
}

async function main() {
  const tsup = spawn('pnpm', ['exec', 'tsup', '--watch'], { stdio: 'inherit', shell: true });

  // Give tsup a moment to produce the first build, then wait for the renderer.
  await delay(1500);
  await waitForRenderer(RENDERER_URL);

  const electron = spawn('pnpm', ['exec', 'electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VERITY_RENDERER_URL: RENDERER_URL },
  });

  const cleanup = () => {
    tsup.kill();
    electron.kill();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await once(electron, 'exit');
  tsup.kill();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
