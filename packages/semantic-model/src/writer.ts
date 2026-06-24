import { stringify } from 'yaml';
import type { NewSemanticTestInput, SemanticTest, SemanticTestPatch } from './types.js';
import { validateSemanticTest } from './validator.js';

/** Stable top-level key order for clean git diffs (architecture §8.3). */
const TOP_LEVEL_KEYS = [
  'version',
  'id',
  'name',
  'adapter',
  'promptVersion',
  'created',
  'modified',
  'steps',
] as const;

const STEP_KEYS = [
  'id',
  'intent',
  'action',
  'context',
  'expected',
  'confidence',
  'locators',
] as const;

const LOCATOR_KEYS = ['ref', 'strategy', 'value', 'invented'] as const;

function orderKeys<T extends Record<string, unknown>>(
  obj: T,
  order: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of order) {
    if (key in obj) result[key] = obj[key];
  }
  for (const key of Object.keys(obj)) {
    if (!(key in result)) result[key] = obj[key];
  }
  return result;
}

function serializeLocator(loc: SemanticTest['steps'][number]['locators'][number]): Record<string, unknown> {
  return orderKeys(
    {
      ref: loc.ref,
      strategy: loc.strategy,
      value: loc.value,
      invented: loc.invented,
    },
    LOCATOR_KEYS,
  );
}

function serializeStep(step: SemanticTest['steps'][number]): Record<string, unknown> {
  const base = orderKeys(
    {
      id: step.id,
      intent: step.intent,
      action: step.action,
      context: step.context,
      expected: step.expected,
      confidence: step.confidence,
      locators: step.locators.map(serializeLocator),
    },
    STEP_KEYS,
  );
  return base;
}

function serializeDocument(test: SemanticTest): Record<string, unknown> {
  return orderKeys(
    {
      version: test.version,
      id: test.id,
      name: test.name,
      adapter: test.adapter,
      promptVersion: test.promptVersion,
      created: test.created,
      modified: test.modified,
      steps: test.steps.map(serializeStep),
    },
    TOP_LEVEL_KEYS,
  );
}

/**
 * Serialize a semantic test to deterministic YAML (stable key ordering).
 */
export function serializeSemanticTestYaml(test: SemanticTest): string {
  validateSemanticTest(test);
  const doc = serializeDocument(test);
  return stringify(doc, {
    lineWidth: 0,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  });
}

/**
 * Create a new semantic test document with timestamps assigned.
 */
export function createSemanticTest(
  input: NewSemanticTestInput,
  now: string = new Date().toISOString(),
): SemanticTest {
  const test: SemanticTest = {
    version: '1',
    id: input.id,
    name: input.name,
    adapter: input.adapter,
    promptVersion: input.promptVersion,
    created: now,
    modified: now,
    steps: input.steps,
  };
  validateSemanticTest(test);
  return test;
}

/**
 * Apply a patch to an existing semantic test, bumping `modified`.
 */
export function patchSemanticTest(
  existing: SemanticTest,
  patch: SemanticTestPatch,
  now: string = new Date().toISOString(),
): SemanticTest {
  const updated: SemanticTest = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.promptVersion !== undefined ? { promptVersion: patch.promptVersion } : {}),
    ...(patch.steps !== undefined ? { steps: patch.steps } : {}),
    modified: now,
  };
  validateSemanticTest(updated);
  return updated;
}
