import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSemanticTest,
  parseSemanticTestYaml,
  patchSemanticTest,
  semanticTestRelativePath,
  serializeSemanticTestYaml,
  slugFromSemanticTestPath,
} from './index.js';

const SAMPLE = createSemanticTest({
  id: 'checkout-flow-001',
  name: 'User completes checkout',
  adapter: 'playwright-java',
  promptVersion: 'step-generation@1.1.0',
  steps: [
    {
      id: 1,
      intent: 'Authenticate user',
      action: 'Enter email & password, submit',
      context: 'Login Page',
      expected: 'Redirected to Home, session active',
      confidence: 0.98,
      locators: [
        {
          ref: 'email-input',
          strategy: 'role',
          value: 'textbox[name="Email address"]',
          invented: false,
        },
      ],
    },
  ],
});

describe('semantic-model roundtrip', () => {
  it('serializes and parses a v1 document', () => {
    const yaml = serializeSemanticTestYaml(SAMPLE);
    assert.match(yaml, /version: "1"/);
    assert.match(yaml, /id: "checkout-flow-001"/);
    const parsed = parseSemanticTestYaml(yaml);
    assert.equal(parsed.id, SAMPLE.id);
    assert.equal(parsed.steps.length, 1);
    assert.equal(parsed.steps[0]?.locators[0]?.ref, 'email-input');
  });

  it('patches bump modified timestamp', () => {
    const patched = patchSemanticTest(SAMPLE, { name: 'Updated name' }, '2026-06-25T00:00:00.000Z');
    assert.equal(patched.name, 'Updated name');
    assert.equal(patched.modified, '2026-06-25T00:00:00.000Z');
    assert.equal(patched.created, SAMPLE.created);
  });

  it('resolves semantic test paths', () => {
    assert.equal(semanticTestRelativePath('checkout-flow-001'), '.verity/tests/checkout-flow-001.yaml');
    assert.equal(
      slugFromSemanticTestPath('.verity/tests/checkout-flow-001.yaml'),
      'checkout-flow-001',
    );
  });

  it('rejects non-monotonic step ids', () => {
    const yaml = `
version: "1"
id: checkout-flow-001
name: User completes checkout
adapter: playwright-java
promptVersion: step-generation@1.1.0
created: 2026-06-24T00:00:00.000Z
modified: 2026-06-24T00:00:00.000Z
steps:
  - id: 2
    intent: Authenticate user
    action: Enter email
    context: Login Page
    expected: Home
    confidence: 0.9
    locators: []
`;
    assert.throws(() => parseSemanticTestYaml(yaml), /monotonic/i);
  });
});
