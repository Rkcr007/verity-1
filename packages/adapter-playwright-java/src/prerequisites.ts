import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  failedCheck,
  prerequisiteReport,
  satisfiedCheck,
  type PrerequisiteCheck,
  type PrerequisiteReport,
} from '@verity/adapter-contract';

const MIN_JAVA_MAJOR = 17;
const MIN_MAVEN_MAJOR = 3;
const MIN_MAVEN_MINOR = 8;

/**
 * Verify JDK, Maven, and Playwright browser binaries before execution (M3 E3-S1 T2).
 */
export function checkPlaywrightJavaPrerequisites(repoRoot: string): PrerequisiteReport {
  void repoRoot;
  const checks: PrerequisiteCheck[] = [
    checkJava(),
    checkMaven(),
    checkPlaywrightBrowsers(),
  ];
  return prerequisiteReport(checks);
}

function checkJava(): PrerequisiteCheck {
  const result = spawnSync('java', ['-version'], { encoding: 'utf8', timeout: 10_000 });
  const output = `${result.stderr ?? ''}${result.stdout ?? ''}`;

  if (result.error || result.status !== 0) {
    return failedCheck(
      'JDK',
      'Java runtime not found on PATH.',
      'Install JDK 17+ and ensure `java` is available in your shell.',
    );
  }

  const match = output.match(/version "(\d+)(?:\.(\d+))?/);
  const major = match?.[1] ? Number.parseInt(match[1], 10) : 0;

  if (major < MIN_JAVA_MAJOR) {
    return failedCheck(
      'JDK',
      `Java ${major} detected — JDK ${MIN_JAVA_MAJOR}+ required.`,
      `Install JDK ${MIN_JAVA_MAJOR}+ (Temurin or Oracle) and update JAVA_HOME.`,
    );
  }

  return satisfiedCheck('JDK', `Java ${major} detected`);
}

function checkMaven(): PrerequisiteCheck {
  const result = spawnSync('mvn', ['-version'], { encoding: 'utf8', timeout: 10_000 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.error || result.status !== 0) {
    return failedCheck(
      'Maven',
      'Maven not found on PATH.',
      'Install Apache Maven 3.8+ and ensure `mvn` is available.',
    );
  }

  const match = output.match(/Apache Maven (\d+)\.(\d+)/);
  const major = match?.[1] ? Number.parseInt(match[1], 10) : 0;
  const minor = match?.[2] ? Number.parseInt(match[2], 10) : 0;

  if (major < MIN_MAVEN_MAJOR || (major === MIN_MAVEN_MAJOR && minor < MIN_MAVEN_MINOR)) {
    return failedCheck(
      'Maven',
      `Maven ${major}.${minor} detected — ${MIN_MAVEN_MAJOR}.${MIN_MAVEN_MINOR}+ required.`,
      'Upgrade Maven to 3.8 or newer.',
    );
  }

  return satisfiedCheck('Maven', `Apache Maven ${major}.${minor}`);
}

function checkPlaywrightBrowsers(): PrerequisiteCheck {
  const cacheDir = playwrightBrowserCacheDir();
  if (!existsSync(cacheDir)) {
    return failedCheck(
      'Playwright browsers',
      'Playwright browser cache not found.',
      'Run `mvn exec:java -D exec.mainClass=com.microsoft.playwright.CLI -D exec.args="install"` in your repo.',
    );
  }

  const hasBrowser = readdirSync(cacheDir).some(
    (name) => name.startsWith('chromium-') || name.startsWith('firefox-') || name.startsWith('webkit-'),
  );

  if (!hasBrowser) {
    return failedCheck(
      'Playwright browsers',
      'No Playwright browser binaries in cache.',
      'Install browsers via Playwright CLI or `mvn` exec goal in your project.',
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
