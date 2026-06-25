import { runGit } from './subprocess.js';

/**
 * Switch to an existing local branch.
 */
export async function checkoutBranch(repoRoot: string, branch: string): Promise<void> {
  const trimmed = branch.trim();
  if (trimmed.length === 0) {
    throw new Error('Branch name is required.');
  }
  await runGit({ repoRoot, args: ['checkout', trimmed] });
}

/**
 * Create and switch to a new branch.
 */
export async function createBranch(repoRoot: string, branch: string): Promise<void> {
  const trimmed = branch.trim();
  if (trimmed.length === 0) {
    throw new Error('Branch name is required.');
  }
  await runGit({ repoRoot, args: ['checkout', '-b', trimmed] });
}
