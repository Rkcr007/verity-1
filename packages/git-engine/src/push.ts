import { runGit, GitCommandError } from './subprocess.js';

export type PushFailureReason = 'auth' | 'remote_ahead' | 'no_upstream' | 'unknown';

export interface PushResult {
  readonly branch: string;
  readonly remote: string;
}

export interface PushFailure {
  readonly reason: PushFailureReason;
  readonly message: string;
}

/**
 * Classify push stderr into user-facing failure reasons.
 */
export function classifyPushFailure(stderr: string): PushFailure {
  const lower = stderr.toLowerCase();

  if (
    lower.includes('authentication failed') ||
    lower.includes('permission denied') ||
    lower.includes('could not read from remote') ||
    lower.includes('invalid username or password')
  ) {
    return {
      reason: 'auth',
      message: 'Push failed — check your git credentials or SSH keys.',
    };
  }

  if (
    lower.includes('non-fast-forward') ||
    lower.includes('rejected') ||
    lower.includes('fetch first') ||
    lower.includes('remote contains work')
  ) {
    return {
      reason: 'remote_ahead',
      message: 'Push rejected — the remote branch has newer commits. Pull or rebase first.',
    };
  }

  if (
    lower.includes('no upstream branch') ||
    lower.includes('set the remote as upstream') ||
    lower.includes('does not appear to be a git repository')
  ) {
    return {
      reason: 'no_upstream',
      message: 'Push failed — no upstream branch is configured for this repository.',
    };
  }

  return {
    reason: 'unknown',
    message: 'Push failed. Check your network connection and remote configuration.',
  };
}

/**
 * Push the current branch to its upstream. Never uses --force.
 */
export async function pushCurrentBranch(repoRoot: string): Promise<PushResult> {
  const branch = (await runGit({ repoRoot, args: ['branch', '--show-current'] })).trim();
  const remote = (
    await runGit({
      repoRoot,
      args: ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
      allowFailure: true,
    })
  ).trim();

  const remoteName = remote.includes('/') ? remote.split('/')[0] ?? 'origin' : 'origin';

  try {
    await runGit({ repoRoot, args: ['push'] });
  } catch (error) {
    if (error instanceof GitCommandError) {
      const failure = classifyPushFailure(error.stderr);
      throw new PushRejectedError(failure.message, failure.reason, error.stderr);
    }
    throw error;
  }

  return {
    branch: branch.length > 0 ? branch : 'HEAD',
    remote: remoteName,
  };
}

/** Push failure with a stable reason code for IPC event mapping. */
export class PushRejectedError extends Error {
  readonly reason: PushFailureReason;
  readonly stderr: string;

  constructor(message: string, reason: PushFailureReason, stderr: string) {
    super(message);
    this.name = 'PushRejectedError';
    this.reason = reason;
    this.stderr = stderr;
  }
}
