import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_IGNORE = new Set([
  '.git',
  'node_modules',
  'target',
  'build',
  'dist',
  'out',
  '.turbo',
  '.idea',
  '.vscode',
]);

/**
 * Load ignore patterns from `.gitignore` at repo root (E1-S3 lightweight).
 */
export function loadIgnorePatterns(repoRoot: string): Set<string> {
  const patterns = new Set(DEFAULT_IGNORE);
  const gitignorePath = join(repoRoot, '.gitignore');
  if (!existsSync(gitignorePath)) return patterns;

  const lines = readFileSync(gitignorePath, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.replace(/^\//, '').replace(/\/$/, '');
    if (normalized.length > 0) patterns.add(normalized);
  }
  return patterns;
}

/** Returns true when a relative path segment should be skipped during walks. */
export function shouldIgnorePath(relativePath: string, patterns: Set<string>): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);

  for (const segment of segments) {
    if (patterns.has(segment)) return true;
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
        if (regex.test(segment)) return true;
      }
    }
  }

  for (const pattern of patterns) {
    if (normalized === pattern || normalized.startsWith(`${pattern}/`)) return true;
  }

  return false;
}
