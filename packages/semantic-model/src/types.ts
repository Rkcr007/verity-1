import type { AdapterId } from '@verity/core';

/**
 * Locator strategies supported in semantic test YAML v1.
 * Adapters map these to framework-specific locator APIs.
 */
export type LocatorStrategy =
  | 'role'
  | 'text'
  | 'placeholder'
  | 'css'
  | 'xpath'
  | 'id'
  | 'name'
  | 'label'
  | 'test-id';

/**
 * Locator reference embedded in a semantic step (architecture §8.2).
 */
export interface StepLocatorRef {
  readonly ref: string;
  readonly strategy: LocatorStrategy;
  readonly value: string;
  readonly invented: boolean;
}

/**
 * One atomic semantic step — intent, action, context, expected, confidence (§3.4).
 */
export interface SemanticStep {
  readonly id: number;
  readonly intent: string;
  readonly action: string;
  readonly context: string;
  readonly expected: string;
  readonly confidence: number;
  readonly locators: readonly StepLocatorRef[];
}

/**
 * SemanticTest — the authoritative test definition persisted as YAML (AD-001).
 *
 * The `id` field is a stable slug (e.g. `checkout-flow-001`), not a ULID.
 * Runtime aggregates may map this to SemanticTestId separately.
 */
export interface SemanticTest {
  readonly version: '1';
  readonly id: string;
  readonly name: string;
  readonly adapter: AdapterId;
  readonly promptVersion: string;
  readonly created: string;
  readonly modified: string;
  readonly steps: readonly SemanticStep[];
}

/** Fields required when authoring a new semantic test (timestamps assigned by writer). */
export interface NewSemanticTestInput {
  readonly id: string;
  readonly name: string;
  readonly adapter: AdapterId;
  readonly promptVersion: string;
  readonly steps: readonly SemanticStep[];
}

/** Partial update applied to an existing semantic test document. */
export interface SemanticTestPatch {
  readonly name?: string;
  readonly promptVersion?: string;
  readonly steps?: readonly SemanticStep[];
}
