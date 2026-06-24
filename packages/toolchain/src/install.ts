import { spawnSync } from 'node:child_process';

export type ToolchainStepStatus = 'ok' | 'failed' | 'skipped';

export interface ToolchainInstallStep {
  readonly name: string;
  readonly status: ToolchainStepStatus;
  readonly detail: string;
}

export interface ToolchainInstallResult {
  readonly steps: readonly ToolchainInstallStep[];
  readonly ready: boolean;
}

const INSTALL_TIMEOUT_MS = 600_000;

/**
 * One-click Java toolchain install — Temurin JDK 17 + Maven (M7).
 * Uses platform package managers when available; otherwise returns guided steps.
 */
export function installJavaToolchain(): ToolchainInstallResult {
  const steps: ToolchainInstallStep[] = [];

  if (commandExists('java') && commandExists('mvn')) {
    return {
      steps: [
        { name: 'JDK', status: 'ok', detail: 'Java already available on PATH.' },
        { name: 'Maven', status: 'ok', detail: 'Maven already available on PATH.' },
      ],
      ready: true,
    };
  }

  if (process.platform === 'darwin') {
    if (!commandExists('brew')) {
      steps.push({
        name: 'Homebrew',
        status: 'failed',
        detail: 'Install Homebrew from https://brew.sh then retry Verity one-click install.',
      });
      return { steps, ready: false };
    }

    if (!commandExists('java')) {
      const jdk = run('brew', ['install', '--cask', 'temurin@17']);
      steps.push(
        jdk.ok
          ? { name: 'JDK (Temurin 17)', status: 'ok', detail: 'Installed via Homebrew.' }
          : { name: 'JDK (Temurin 17)', status: 'failed', detail: jdk.detail },
      );
    } else {
      steps.push({ name: 'JDK', status: 'ok', detail: 'Already installed.' });
    }

    if (!commandExists('mvn')) {
      const maven = run('brew', ['install', 'maven']);
      steps.push(
        maven.ok
          ? { name: 'Maven', status: 'ok', detail: 'Installed via Homebrew.' }
          : { name: 'Maven', status: 'failed', detail: maven.detail },
      );
    } else {
      steps.push({ name: 'Maven', status: 'ok', detail: 'Already installed.' });
    }
  } else if (process.platform === 'win32') {
    if (!commandExists('java')) {
      const jdk = run('winget', [
        'install',
        '-e',
        '--id',
        'EclipseAdoptium.Temurin.17.JDK',
        '--accept-package-agreements',
        '--accept-source-agreements',
      ]);
      steps.push(
        jdk.ok
          ? { name: 'JDK (Temurin 17)', status: 'ok', detail: 'Installed via winget.' }
          : { name: 'JDK (Temurin 17)', status: 'failed', detail: jdk.detail },
      );
    } else {
      steps.push({ name: 'JDK', status: 'ok', detail: 'Already installed.' });
    }

    if (!commandExists('mvn')) {
      const maven = run('winget', [
        'install',
        '-e',
        '--id',
        'Apache.Maven',
        '--accept-package-agreements',
        '--accept-source-agreements',
      ]);
      steps.push(
        maven.ok
          ? { name: 'Maven', status: 'ok', detail: 'Installed via winget.' }
          : {
              name: 'Maven',
              status: 'failed',
              detail: maven.detail || 'Install Maven manually from https://maven.apache.org',
            },
      );
    } else {
      steps.push({ name: 'Maven', status: 'ok', detail: 'Already installed.' });
    }
  } else {
    steps.push({
      name: 'Linux toolchain',
      status: 'failed',
      detail:
        'Run: sudo apt install openjdk-17-jdk maven  (or use sdkman.io) then restart your terminal.',
    });
    return { steps, ready: false };
  }

  const ready = steps.every((s) => s.status === 'ok') && commandExists('java') && commandExists('mvn');
  return { steps, ready };
}

/**
 * One-click Node.js toolchain install (M7).
 */
export function installNodeToolchain(): ToolchainInstallResult {
  if (commandExists('node') && commandExists('npm')) {
    return {
      steps: [
        { name: 'Node.js', status: 'ok', detail: 'Node already available on PATH.' },
        { name: 'npm', status: 'ok', detail: 'npm already available on PATH.' },
      ],
      ready: true,
    };
  }

  const steps: ToolchainInstallStep[] = [];

  if (process.platform === 'darwin') {
    if (!commandExists('brew')) {
      return {
        steps: [
          {
            name: 'Homebrew',
            status: 'failed',
            detail: 'Install Homebrew from https://brew.sh then retry.',
          },
        ],
        ready: false,
      };
    }
    const node = run('brew', ['install', 'node@20']);
    steps.push(
      node.ok
        ? { name: 'Node.js 20', status: 'ok', detail: 'Installed via Homebrew. Restart terminal if needed.' }
        : { name: 'Node.js 20', status: 'failed', detail: node.detail },
    );
  } else if (process.platform === 'win32') {
    const node = run('winget', [
      'install',
      '-e',
      '--id',
      'OpenJS.NodeJS.LTS',
      '--accept-package-agreements',
      '--accept-source-agreements',
    ]);
    steps.push(
      node.ok
        ? { name: 'Node.js LTS', status: 'ok', detail: 'Installed via winget. Restart terminal if needed.' }
        : { name: 'Node.js LTS', status: 'failed', detail: node.detail },
    );
  } else {
    steps.push({
      name: 'Node.js',
      status: 'failed',
      detail: 'Run: sudo apt install nodejs npm  or use nvm, then restart terminal.',
    });
    return { steps, ready: false };
  }

  const ready = commandExists('node') && commandExists('npm');
  return { steps, ready };
}

function commandExists(cmd: string): boolean {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(which, [cmd], { encoding: 'utf8', timeout: 5_000 });
  return result.status === 0;
}

function run(cmd: string, args: readonly string[]): { ok: boolean; detail: string } {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    timeout: INSTALL_TIMEOUT_MS,
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.error) {
    return { ok: false, detail: result.error.message };
  }

  if (result.status !== 0) {
    const tail = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim().slice(-500);
    return { ok: false, detail: tail || `${cmd} exited ${result.status}` };
  }

  return { ok: true, detail: 'Success' };
}
