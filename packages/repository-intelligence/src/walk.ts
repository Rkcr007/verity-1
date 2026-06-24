import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'target',
  'build',
  'dist',
  'out',
  '.verity',
  '.idea',
  '.vscode',
]);

/**
 * Walk repository files, skipping common build and VCS directories.
 */
export function walkRepository(
  repoRoot: string,
  onFile: (fullPath: string, name: string) => void,
): void {
  walk(repoRoot, onFile);
}

function walk(dir: string, onFile: (fullPath: string, name: string) => void): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const fullPath = join(dir, name);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(fullPath, onFile);
    } else if (stat.isFile()) {
      onFile(fullPath, name);
    }
  }
}

/** Count Java sources whose filename ends with `Page.java`. */
export function countPageObjectFiles(repoRoot: string): number {
  let count = 0;
  walkRepository(repoRoot, (_fullPath, name) => {
    if (name.endsWith('Page.java')) count += 1;
  });
  return count;
}

/** Count TypeScript page object files (`*.page.ts`, `*Page.ts`). */
export function countTypeScriptPageObjectFiles(repoRoot: string): number {
  let count = 0;
  walkRepository(repoRoot, (_fullPath, name) => {
    if (name.endsWith('.page.ts') || name.endsWith('Page.ts')) count += 1;
  });
  return count;
}
