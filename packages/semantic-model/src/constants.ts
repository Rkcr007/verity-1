/** Current semantic test YAML schema version (architecture §8.3). */
export const CURRENT_SCHEMA_VERSION = '1' as const;

/** Directory inside a customer repo where semantic tests are stored (architecture §8.2). */
export const SEMANTIC_TESTS_DIR = '.verity/tests';

/** File extension for semantic test documents. */
export const SEMANTIC_TEST_EXTENSION = '.yaml';

/** Slug pattern for test ids and filenames. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
