import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WorkspaceId } from '@verity/core';
import { emptyRepositoryIndexSnapshot } from '@verity/adapter-contract';
import { createSemanticTest } from '@verity/semantic-model';
import { transpileStep } from './transpile-step.js';
import { transpileSemanticTest } from './transpile-test.js';

describe('transpileStep', () => {
  it('emits navigate for navigate action', () => {
    const lines = transpileStep({
      id: 1,
      intent: 'Open app',
      action: 'navigate',
      context: 'https://shop.example.com',
      expected: 'Page loads',
      confidence: 0.9,
      locators: [],
    });
    assert.ok(lines.some((l) => l.includes('page.navigate("https://shop.example.com")')));
  });

  it('emits click for click action with role locator', () => {
    const lines = transpileStep({
      id: 2,
      intent: 'Submit',
      action: 'click',
      context: 'Login form',
      expected: 'Form submits',
      confidence: 0.85,
      locators: [{ ref: 'sign-in-btn', strategy: 'role', value: 'Sign in', invented: false }],
    });
    assert.ok(lines.some((l) => l.includes('.click();')));
    assert.ok(lines.some((l) => l.includes('getByRole')));
  });

  it('emits assertTrue for assert action', () => {
    const lines = transpileStep({
      id: 3,
      intent: 'Verify banner',
      action: 'assert',
      context: 'Dashboard',
      expected: 'Welcome banner visible',
      confidence: 0.8,
      locators: [{ ref: 'welcome', strategy: 'text', value: 'Welcome', invented: false }],
    });
    assert.ok(lines.some((l) => l.includes('assertTrue(')));
  });
});

describe('transpileSemanticTest', () => {
  it('generates a JUnit test class with package and imports', () => {
    const test = createSemanticTest({
      id: 'login-flow',
      name: 'Login flow',
      adapter: 'playwright-java',
      promptVersion: 'manual@1.0.0',
      steps: [
        {
          id: 1,
          intent: 'Open login',
          action: 'navigate',
          context: 'https://app.test/login',
          expected: 'Login page',
          confidence: 0.9,
          locators: [],
        },
      ],
    });

    const index = emptyRepositoryIndexSnapshot(WorkspaceId());
    const result = transpileSemanticTest(test, index, '');

    assert.equal(result.files.length, 1);
    const file = result.files[0];
    assert.ok(file);
    assert.ok(file.content.includes('public class LoginFlow'));
    assert.ok(file.content.includes('@Test'));
    assert.ok(file.content.includes('Playwright.create()'));
    assert.ok(file.path.includes('src/test/java'));
  });
});
