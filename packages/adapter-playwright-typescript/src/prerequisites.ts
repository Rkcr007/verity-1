import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  failedCheck,
  prerequisiteReport,
  satisfiedCheck,
  type PrerequisiteCheck,
  type PrerequisiteReport,
} from '@verity/adapter-contract';

const MIN_NODE_MAJOR = 20;

/**
 * Verify Node.js, npm, and Playwright browser cache before TS execution (M1.7).
 */
export function checkPlaywrightTypeScriptPrerequisites(repoRoot: string): PrerequisiteReport {
  void repoRoot;
  const checks: PrerequisiteCheck[] = [checkNode(), checkNpm(), checkPlaywrightBrowsers()];
  return prerequisiteReport(checks);
}

function checkNode(): PrerequisiteCheck {
  const result = spawnSync('node', ['-v'], { encoding: 'utf8', timeout: 10_000 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();

  if (result.error || result.status !== 0) {
    return failedCheck(
      'Node.js',
      'Node.js not found on PATH.',
      'Install Node.js 20+ (nodejs.org) or use Verity one-click install.',
    );
  }

  const match = output.match(/v?(\d+)/);
  const major = match?.[1] ? Number.parseInt(match[1], 10) : 0;
  if (major < MIN_NODE_MAJOR) {
    return failedCheck(
      'Node.js',
      `Node ${major} detected — Node ${MIN_NODE_MAJOR}+ required.`,
      `Upgrade Node.js to ${MIN_NODE_MAJOR}+.`,
    );
  }

  return satisfiedCheck('Node.js', `Node ${major} detected`);
}

function checkNpm(): PrerequisiteCheck {
  const result = spawnSync('npm', ['-v'], { encoding: 'utf8', timeout: 10_000 });
  if (result.error || result.status !== 0) {
    return failedCheck(
      'npm',
      'npm not found on PATH.',
      'Install Node.js (includes npm) or use Verity one-click install.',
    );
  }
  const version = `${result.stdout ?? ''}`.trim();
  return satisfiedCheck('npm', `npm ${version}`);
}

function checkPlaywrightBrowsers(): PrerequisiteCheck {
  const cacheDir = playwrightBrowserCacheDir();
  if (!existsSync(cacheDir)) {
    return failedCheck(
      'Playwright browsers',
      'Playwright browser cache not found.',
      'Run `npx playwright install chromium` in your repo or use Verity auto-setup.',
    );
  }

  const hasBrowser = readdirSync(cacheDir).some(
    (name) => name.startsWith('chromium-') || name.startsWith('firefox-') || name.startsWith('webkit-'),
  );

  if (!hasBrowser) {
    return failedCheck(
      'Playwright browsers',
      'No Playwright browser binaries in cache.',
      'Install browsers via `npx playwright install`.',
    );
  }

  return satisfiedCheck('Playwright browsers', 'Browser binaries present in local cache');
}

function playwrightBrowserCacheDir(): string {
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
    return join(local, 'ms-playwright');
  }
  return join(homedir(), '.cache', 'ms-playwright');
}
