import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assembleGenerationContext } from './context-assembler.js';
import { generateStepsFromPrompt } from './step-generator.js';

describe('generateStepsFromPrompt', () => {
  it('returns rule-based steps when no API key is configured', async () => {
    const context = assembleGenerationContext('Checkout flow test', {
      projectId: 'ws-1' as import('@verity/core').WorkspaceId,
      version: 0,
      understandingScore: 0,
      indexedAt: 0,
      pages: [{ id: 'p1', name: 'CheckoutPage', understandingScore: 0.8, locatorCount: 2 }],
      flows: [{ id: 'f1', name: 'Checkout', stepCount: 3, confidence: 0.7 }],
      locators: [],
      conventions: {},
    }, []);

    const result = await generateStepsFromPrompt(context, 'playwright-java', { apiKey: '' });

    assert.equal(result.source, 'rules');
    assert.ok(result.steps.length >= 2);
    assert.ok(result.slug.length > 0);
    assert.ok(result.testName.length > 0);
  });
});
