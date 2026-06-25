import { basename } from 'node:path';
import type { GitChangeType } from '@verity/core/ipc';
import { runGit } from './subprocess.js';

export interface GitChange {
  readonly path: string;
  readonly fileName: string;
  readonly type: GitChangeType;
}

export interface GitStatusResult {
  readonly branch: string;
  readonly upstream: string | undefined;
  readonly ahead: number;
  readonly behind: number;
  readonly hasMergeConflicts: boolean;
  readonly changes: readonly GitChange[];
}

/**
 * Map porcelain status codes to A/M/D/U for the working tree.
 * @see https://git-scm.com/docs/git-status#_porcelain_format
 */
function isMergeConflict(indexStatus: string, workTreeStatus: string): boolean {
  if (indexStatus === 'U' || workTreeStatus === 'U') return true;
  const pair = `${indexStatus}${workTreeStatus}`;
  return pair === 'AA' || pair === 'DD' || pair === 'AU' || pair === 'UA' || pair === 'DU' || pair === 'UD';
}

function mapPorcelainStatus(indexStatus: string, workTreeStatus: string): GitChangeType | null {
  if (indexStatus === '!' || workTreeStatus === '!') return null;
  if (isMergeConflict(indexStatus, workTreeStatus)) return 'U';
  if (indexStatus === 'D' || workTreeStatus === 'D') return 'D';
  if (indexStatus === 'A' || workTreeStatus === 'A') return 'A';
  if (
    indexStatus === 'M' ||
    workTreeStatus === 'M' ||
    indexStatus === 'R' ||
    workTreeStatus === 'R' ||
    indexStatus === 'C' ||
    workTreeStatus === 'C'
  ) {
    return 'M';
  }
  return null;
}

/**
 * Parse `git status --porcelain=v1 -uall` lines into change records.
 */
export function parsePorcelainStatus(output: string): readonly GitChange[] {
  const changes: GitChange[] = [];

  for (const line of output.split(/\r?\n/)) {
    if (line.length < 4) continue;
    const indexStatus = line[0] ?? ' ';
    const workTreeStatus = line[1] ?? ' ';
    if (indexStatus === '?' && workTreeStatus === '?') {
      const path = line.slice(3).trim();
      if (path.length === 0) continue;
      changes.push({ path, fileName: basename(path), type: 'A' });
      continue;
    }

    const type = mapPorcelainStatus(indexStatus, workTreeStatus);
    if (!type) continue;

    let path = line.slice(3).trim();
    const renameArrow = path.indexOf(' -> ');
    if (renameArrow >= 0) {
      path = path.slice(renameArrow + 4).trim();
    }
    if (path.length === 0) continue;
    changes.push({ path, fileName: basename(path), type });
  }

  return changes;
}

async function readBranch(repoRoot: string): Promise<string> {
  const branch = (await runGit({ repoRoot, args: ['branch', '--show-current'] })).trim();
  return branch.length > 0 ? branch : 'HEAD';
}

async function readUpstreamTracking(
  repoRoot: string,
): Promise<{ upstream: string | undefined; ahead: number; behind: number }> {
  const upstream = (
    await runGit({
      repoRoot,
      args: ['rev-parse', '--abbrev-ref', '@{upstream}'],
      allowFailure: true,
    })
  ).trim();

  if (!upstream) {
    return { upstream: undefined, ahead: 0, behind: 0 };
  }

  const counts = (
    await runGit({
      repoRoot,
      args: ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'],
      allowFailure: true,
    })
  ).trim();

  const [behindRaw, aheadRaw] = counts.split(/\s+/);
  return {
    upstream,
    ahead: Number.parseInt(aheadRaw ?? '0', 10) || 0,
    behind: Number.parseInt(behindRaw ?? '0', 10) || 0,
  };
}

/**
 * Read working tree status for a repository.
 */
export async function getStatus(repoRoot: string): Promise<GitStatusResult> {
  const porcelain = await runGit({
    repoRoot,
    args: ['status', '--porcelain=v1', '-uall'],
  });
  const [branch, tracking] = await Promise.all([
    readBranch(repoRoot),
    readUpstreamTracking(repoRoot),
  ]);
  const changes = parsePorcelainStatus(porcelain);

  return {
    branch,
    upstream: tracking.upstream,
    ahead: tracking.ahead,
    behind: tracking.behind,
    hasMergeConflicts: changes.some((change) => change.type === 'U'),
    changes,
  };
}
