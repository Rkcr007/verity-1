import { join } from 'node:path';
import { SEMANTIC_TESTS_DIR, SEMANTIC_TEST_EXTENSION } from './constants.js';

/**
 * Relative path for a semantic test file inside a repository.
 * @example semanticTestRelativePath('checkout-flow-001') → '.verity/tests/checkout-flow-001.yaml'
 */
export function semanticTestRelativePath(slug: string): string {
  return join(SEMANTIC_TESTS_DIR, `${slug}${SEMANTIC_TEST_EXTENSION}`);
}

/**
 * Extract the slug from a semantic test relative or absolute file path.
 */
export function slugFromSemanticTestPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');
  const prefix = `${SEMANTIC_TESTS_DIR}/`;
  if (!normalized.includes(prefix)) return null;
  const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (!basename.endsWith(SEMANTIC_TEST_EXTENSION)) return null;
  return basename.slice(0, -SEMANTIC_TEST_EXTENSION.length);
}
