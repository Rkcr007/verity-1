import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type SetupStepStatus = 'ok' | 'failed' | 'skipped';

export interface EnvironmentSetupStep {
  readonly name: string;
  readonly status: SetupStepStatus;
  readonly detail: string;
}

export interface EnvironmentSetupResult {
  readonly steps: readonly EnvironmentSetupStep[];
  readonly ready: boolean;
}

const INSTALL_TIMEOUT_MS = 300_000;

/**
 * Runs npm install and Playwright browser install after greenfield scaffold (M1.7).
 */
export function setupPlaywrightTypeScriptEnvironment(repoRoot: string): EnvironmentSetupResult {
  const packagePath = join(repoRoot, 'package.json');
  if (!existsSync(packagePath)) {
    return {
      steps: [{ name: 'Project layout', status: 'failed', detail: 'package.json not found.' }],
      ready: false,
    };
  }

  const steps: EnvironmentSetupStep[] = [];

  const install = runCommand('npm', ['install', '--no-fund', '--no-audit'], repoRoot);
  steps.push(
    install.ok
      ? { name: 'npm dependencies', status: 'ok', detail: 'Installed project dependencies.' }
      : { name: 'npm dependencies', status: 'failed', detail: install.detail },
  );

  const browsers = runCommand(
    'npx',
    ['playwright', 'install', 'chromium'],
    repoRoot,
    INSTALL_TIMEOUT_MS,
  );
  steps.push(
    browsers.ok
      ? { name: 'Playwright browsers', status: 'ok', detail: 'Chromium installed for local runs.' }
      : {
          name: 'Playwright browsers',
          status: install.ok ? 'failed' : 'skipped',
          detail: browsers.detail,
        },
  );

  return { steps, ready: steps.every((s) => s.status === 'ok') };
}

function runCommand(
  cmd: string,
  args: readonly string[],
  cwd: string,
  timeoutMs = INSTALL_TIMEOUT_MS,
): { ok: boolean; detail: string } {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.error) {
    return {
      ok: false,
      detail:
        result.error.message.includes('ENOENT')
          ? `${cmd} not found — install Node.js 20+ and ensure it is on PATH.`
          : result.error.message,
    };
  }

  if (result.status !== 0) {
    const tail = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim().slice(-400);
    return { ok: false, detail: tail || `${cmd} exited with code ${result.status}` };
  }

  return { ok: true, detail: 'Success' };
}
