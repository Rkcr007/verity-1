import { runGit } from './subprocess.js';

export type DiffLineKind = '+' | '-' | ' ';

export interface DiffLine {
  readonly kind: DiffLineKind;
  readonly content: string;
}

/**
 * Parse unified diff output into display lines (+ / - / context).
 */
export function parseUnifiedDiff(output: string): readonly DiffLine[] {
  const lines: DiffLine[] = [];

  for (const raw of output.split(/\r?\n/)) {
    if (
      raw.startsWith('diff --git') ||
      raw.startsWith('index ') ||
      raw.startsWith('--- ') ||
      raw.startsWith('+++ ') ||
      raw.startsWith('@@ ')
    ) {
      continue;
    }
    if (raw.startsWith('+')) {
      lines.push({ kind: '+', content: raw.slice(1) });
    } else if (raw.startsWith('-')) {
      lines.push({ kind: '-', content: raw.slice(1) });
    } else if (raw.startsWith(' ')) {
      lines.push({ kind: ' ', content: raw.slice(1) });
    } else if (raw.startsWith('\\')) {
      lines.push({ kind: ' ', content: raw });
    }
  }

  return lines;
}

/**
 * Return unified diff lines for a single path (staged + unstaged).
 */
export async function getDiff(repoRoot: string, filePath: string): Promise<readonly DiffLine[]> {
  const output = await runGit({
    repoRoot,
    args: ['diff', 'HEAD', '--', filePath],
    allowFailure: true,
  });

  if (output.trim().length > 0) {
    return parseUnifiedDiff(output);
  }

  const nullPath = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const untracked = await runGit({
    repoRoot,
    args: ['diff', '--no-index', '--', nullPath, filePath],
    allowFailure: true,
  });

  return parseUnifiedDiff(untracked);
}
