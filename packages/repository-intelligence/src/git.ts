import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Read default git branch from HEAD if present. */
export function detectDefaultBranch(repoRoot: string): string {
  try {
    const head = readFileSync(join(repoRoot, '.git', 'HEAD'), 'utf8').trim();
    const match = head.match(/ref: refs\/heads\/(.+)/);
    return match?.[1] ?? 'main';
  } catch {
    return 'main';
  }
}
