import { z } from 'zod';
import type { AdapterId } from '@verity/core';
import { SLUG_PATTERN } from '../constants.js';

const ADAPTER_IDS = [
  'playwright-java',
  'selenium-java',
  'playwright-typescript',
  'selenium-python',
  'cypress',
] as const satisfies readonly AdapterId[];

const LOCATOR_STRATEGIES = [
  'role',
  'text',
  'placeholder',
  'css',
  'xpath',
  'id',
  'name',
  'label',
  'test-id',
] as const;

export const stepLocatorRefSchema = z.object({
  ref: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Locator ref must be kebab-case'),
  strategy: z.enum(LOCATOR_STRATEGIES),
  value: z.string().min(1).max(500),
  invented: z.boolean(),
});

export const semanticStepSchema = z.object({
  id: z.number().int().positive(),
  intent: z.string().min(1).max(500),
  action: z.string().min(1).max(1000),
  context: z.string().min(1).max(200),
  expected: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1),
  locators: z.array(stepLocatorRefSchema).default([]),
});

export const semanticTestSchemaV1 = z.object({
  version: z.literal('1'),
  id: z.string().min(1).max(80).regex(SLUG_PATTERN, 'Test id must be kebab-case slug'),
  name: z.string().min(1).max(200),
  adapter: z.enum(ADAPTER_IDS),
  promptVersion: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+@[0-9]+\.[0-9]+\.[0-9]+$/, 'promptVersion must be name@semver'),
  created: z.string().datetime({ offset: true }),
  modified: z.string().datetime({ offset: true }),
  steps: z.array(semanticStepSchema).min(1, 'Semantic test must have at least one step'),
});

export type SemanticTestSchemaV1 = z.infer<typeof semanticTestSchemaV1>;

/** Root schema — dispatches on `version` as new versions are added. */
export const semanticTestSchema = semanticTestSchemaV1;

export type ParsedSemanticTest = z.infer<typeof semanticTestSchema>;
