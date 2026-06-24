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

const MAVEN_TIMEOUT_MS = 180_000;
const BROWSER_INSTALL_TIMEOUT_MS = 300_000;

/**
 * Resolves Maven dependencies and installs Playwright browsers after greenfield scaffold (M1.6).
 * Failures are non-fatal — prerequisites UI guides manual fixes.
 */
export function setupPlaywrightJavaEnvironment(repoRoot: string): EnvironmentSetupResult {
  const pomPath = join(repoRoot, 'pom.xml');
  if (!existsSync(pomPath)) {
    return {
      steps: [
        {
          name: 'Project layout',
          status: 'failed',
          detail: 'pom.xml not found — scaffold may be incomplete.',
        },
      ],
      ready: false,
    };
  }

  const steps: EnvironmentSetupStep[] = [];

  const deps = runMaven(repoRoot, ['-q', 'dependency:resolve', '-DskipTests']);
  steps.push(
    deps.ok
      ? { name: 'Maven dependencies', status: 'ok', detail: 'Resolved project dependencies.' }
      : {
          name: 'Maven dependencies',
          status: 'failed',
          detail: deps.detail,
        },
  );

  const compile = runMaven(repoRoot, ['-q', 'test-compile', '-DskipTests']);
  steps.push(
    compile.ok
      ? { name: 'Compile test sources', status: 'ok', detail: 'Java test sources compiled.' }
      : {
          name: 'Compile test sources',
          status: deps.ok ? 'failed' : 'skipped',
          detail: compile.detail,
        },
  );

  const browsers = runMaven(repoRoot, [
    '-q',
    'exec:java',
    '-Dexec.mainClass=com.microsoft.playwright.CLI',
    '-Dexec.args=install chromium',
  ], BROWSER_INSTALL_TIMEOUT_MS);

  steps.push(
    browsers.ok
      ? { name: 'Playwright browsers', status: 'ok', detail: 'Chromium installed for local runs.' }
      : {
          name: 'Playwright browsers',
          status: compile.ok ? 'failed' : 'skipped',
          detail: browsers.detail,
        },
  );

  const ready = steps.every((s) => s.status === 'ok');
  return { steps, ready };
}

function runMaven(
  repoRoot: string,
  args: readonly string[],
  timeoutMs = MAVEN_TIMEOUT_MS,
): { ok: boolean; detail: string } {
  const result = spawnSync('mvn', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
  });

  if (result.error) {
    return {
      ok: false,
      detail:
        result.error.message.includes('ENOENT')
          ? 'Maven not found — install Apache Maven 3.8+ and ensure `mvn` is on PATH.'
          : result.error.message,
    };
  }

  if (result.status !== 0) {
    const tail = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim().slice(-400);
    return { ok: false, detail: tail || `Maven exited with code ${result.status}` };
  }

  return { ok: true, detail: 'Success' };
}
