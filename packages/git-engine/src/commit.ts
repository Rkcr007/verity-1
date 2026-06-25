import { getStatus } from './status.js';
import { runGit } from './subprocess.js';

export interface CommitOptions {
  readonly repoRoot: string;
  readonly message: string;
  readonly files: readonly string[];
  readonly authorName?: string;
}

export interface CommitResult {
  readonly commitSha: string;
  readonly fileCount: number;
}

/**
 * Stage selected files and create a commit. Re-reads status before staging so
 * only paths that still appear in the working tree are included.
 */
export async function commitChanges(options: CommitOptions): Promise<CommitResult> {
  const trimmedMessage = options.message.trim();
  if (trimmedMessage.length === 0) {
    throw new Error('Commit message is required.');
  }
  if (options.files.length === 0) {
    throw new Error('Select at least one file to commit.');
  }

  const status = await getStatus(options.repoRoot);
  const allowed = new Set(status.changes.map((change) => change.path));
  const selected = options.files.filter((file) => allowed.has(file));

  if (selected.length === 0) {
    throw new Error('None of the selected files have pending changes.');
  }

  await runGit({
    repoRoot: options.repoRoot,
    args: ['add', '--', ...selected],
  });

  const commitArgs = ['commit', '-m', trimmedMessage];
  if (options.authorName) {
    commitArgs.push('--author', `${options.authorName} <verity@local>`);
  }

  await runGit({
    repoRoot: options.repoRoot,
    args: commitArgs,
  });

  const sha = (await runGit({ repoRoot: options.repoRoot, args: ['rev-parse', 'HEAD'] })).trim();

  return {
    commitSha: sha,
    fileCount: selected.length,
  };
}
