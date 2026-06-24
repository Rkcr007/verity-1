export {
  CURRENT_SCHEMA_VERSION,
  SEMANTIC_TESTS_DIR,
  SEMANTIC_TEST_EXTENSION,
  SLUG_PATTERN,
} from './constants.js';

export type {
  LocatorStrategy,
  StepLocatorRef,
  SemanticStep,
  SemanticTest,
  NewSemanticTestInput,
  SemanticTestPatch,
} from './types.js';

export {
  stepLocatorRefSchema,
  semanticStepSchema,
  semanticTestSchemaV1,
  semanticTestSchema,
} from './schema/v1.js';
export type { SemanticTestSchemaV1, ParsedSemanticTest } from './schema/v1.js';

export { parseSemanticTestYaml, tryParseSemanticTestYaml } from './reader.js';
export { assertSemanticInvariants, validateSemanticTest } from './validator.js';
export { migrateToCurrent } from './migrator.js';
export { semanticTestRelativePath, slugFromSemanticTestPath } from './paths.js';
export { serializeSemanticTestYaml, createSemanticTest, patchSemanticTest } from './writer.js';
