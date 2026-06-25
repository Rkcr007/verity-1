import { spawn } from 'node:child_process';

/** Thrown when a git subprocess exits non-zero or fails to spawn. */
export class GitCommandError extends Error {
  readonly exitCode: number;
  readonly stderr: string;

  constructor(message: string, exitCode: number, stderr: string) {
    super(message);
    this.name = 'GitCommandError';
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export interface RunGitOptions {
  readonly repoRoot: string;
  readonly args: readonly string[];
  /** When true, a non-zero exit code returns empty stdout instead of throwing. */
  readonly allowFailure?: boolean;
}

/**
 * Run a git command in a repository root and return stdout.
 * @throws {GitCommandError} When git exits non-zero (unless allowFailure).
 */
export function runGit(options: RunGitOptions): Promise<string> {
  const { repoRoot, args, allowFailure = false } = options;

  return new Promise((resolve, reject) => {
    const child = spawn('git', [...args], {
      cwd: repoRoot,
      env: process.env,
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('close', (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0 && !allowFailure) {
        reject(new GitCommandError(stderr.trim() || `git ${args.join(' ')} failed`, exitCode, stderr));
        return;
      }
      resolve(stdout);
    });

    child.on('error', (error) => {
      reject(
        new GitCommandError(
          error instanceof Error ? error.message : String(error),
          1,
          stderr,
        ),
      );
    });
  });
}
