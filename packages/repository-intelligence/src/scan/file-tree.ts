import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { FileNode } from '@verity/core/ipc';
import { loadIgnorePatterns, shouldIgnorePath } from './gitignore.js';

export interface FileTreeOptions {
  readonly maxDepth?: number;
  readonly maxEntries?: number;
}

const DEFAULT_OPTIONS: Required<FileTreeOptions> = {
  maxDepth: 6,
  maxEntries: 800,
};

/**
 * Build a repository file tree for workspace navigation (E1-S3 T1).
 */
export function buildFileTree(
  repoRoot: string,
  options: FileTreeOptions = {},
): readonly FileNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ignore = loadIgnorePatterns(repoRoot);
  let entryCount = 0;

  const walk = (dir: string, depth: number): FileNode[] => {
    if (depth > opts.maxDepth || entryCount >= opts.maxEntries) return [];

    let names: string[];
    try {
      names = readdirSync(dir).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }

    const nodes: FileNode[] = [];
    for (const name of names) {
      if (entryCount >= opts.maxEntries) break;
      const fullPath = join(dir, name);
      const rel = relative(repoRoot, fullPath).replace(/\\/g, '/');
      if (shouldIgnorePath(rel, ignore)) continue;

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      entryCount += 1;
      if (stat.isDirectory()) {
        nodes.push({
          name,
          path: rel,
          type: 'directory',
          status: 'clean',
          children: walk(fullPath, depth + 1),
        });
      } else if (stat.isFile()) {
        nodes.push({
          name,
          path: rel,
          type: 'file',
          status: 'clean',
        });
      }
    }
    return nodes;
  };

  return walk(repoRoot, 0);
}
