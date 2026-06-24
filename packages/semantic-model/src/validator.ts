import { ValidationError } from '@verity/core';
import type { SemanticTest, SemanticStep } from './types.js';

/**
 * Domain invariants beyond Zod structural validation (architecture §3.2 SemanticTest).
 */
export function assertSemanticInvariants(test: SemanticTest): void {
  assertMonotonicStepIds(test.steps);
  assertIdMatchesSlug(test.id);
}

function assertMonotonicStepIds(steps: readonly SemanticStep[]): void {
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (!step) continue;
    const expectedId = i + 1;
    if (step.id !== expectedId) {
      throw new ValidationError(
        `Step ids must be monotonic starting at 1; expected ${expectedId}, got ${step.id}.`,
      );
    }
  }
}

function assertIdMatchesSlug(id: string): void {
  if (id !== id.toLowerCase()) {
    throw new ValidationError('Semantic test id must be lowercase kebab-case.');
  }
}

/**
 * Validate an in-memory semantic test (e.g. before apply/write).
 */
export function validateSemanticTest(test: SemanticTest): void {
  assertSemanticInvariants(test);
}
