import { ValidationError } from '@verity/core';
import { parse as parseYaml } from 'yaml';
import { migrateToCurrent } from './migrator.js';
import { semanticTestSchema } from './schema/v1.js';
import { assertSemanticInvariants } from './validator.js';
import type { SemanticTest } from './types.js';

/**
 * Parse and validate semantic test YAML content.
 * Invalid documents throw ValidationError — they never reach an adapter.
 */
export function parseSemanticTestYaml(content: string): SemanticTest {
  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ValidationError('Semantic test YAML is malformed.', detail);
  }

  if (raw === null || raw === undefined) {
    throw new ValidationError('Semantic test file is empty.');
  }

  const migrated = migrateToCurrent(raw);
  const parsed = semanticTestSchema.safeParse(migrated);

  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ValidationError('Semantic test failed schema validation.', detail);
  }

  assertSemanticInvariants(parsed.data);
  return parsed.data;
}

/**
 * Parse semantic test YAML without throwing — for UI preview paths.
 */
export function tryParseSemanticTestYaml(
  content: string,
): { ok: true; data: SemanticTest } | { ok: false; error: string } {
  try {
    return { ok: true, data: parseSemanticTestYaml(content) };
  } catch (error) {
    const message = error instanceof ValidationError ? error.userMessage : 'Invalid semantic test.';
    const detail = error instanceof ValidationError ? error.detail : undefined;
    return { ok: false, error: detail ? `${message} ${detail}` : message };
  }
}
