import { ValidationError } from '@verity/core';
import { CURRENT_SCHEMA_VERSION } from './constants.js';

/**
 * Upgrade raw parsed YAML to the current schema version (architecture §8.3).
 *
 * v1 is the only version today; future migrators chain here.
 */
export function migrateToCurrent(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) {
    throw new ValidationError('Semantic test root must be a YAML mapping.');
  }

  const record = raw as Record<string, unknown>;
  const version = record.version;

  if (version === undefined) {
    throw new ValidationError(
      'Semantic test is missing a version field.',
      `Expected version "${CURRENT_SCHEMA_VERSION}".`,
    );
  }

  if (version === '1' || version === 1) {
    return { ...record, version: '1' };
  }

  throw new ValidationError(
    `Unsupported semantic test schema version: ${String(version)}.`,
    `Supported: "${CURRENT_SCHEMA_VERSION}".`,
  );
}
