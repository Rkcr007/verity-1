import { runGit } from './subprocess.js';

export interface BranchInfo {
  readonly current: string;
  readonly branches: readonly string[];
}

/**
 * List local branches and the checked-out branch name.
 */
export async function listBranches(repoRoot: string): Promise<BranchInfo> {
  const [current, branchOutput] = await Promise.all([
    runGit({ repoRoot, args: ['branch', '--show-current'] }),
    runGit({ repoRoot, args: ['branch', '--format=%(refname:short)'] }),
  ]);

  const branches = branchOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    current: current.trim().length > 0 ? current.trim() : 'HEAD',
    branches,
  };
}
