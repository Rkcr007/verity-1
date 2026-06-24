import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enrichRepositoryIndex } from './enrich-index.js';
import type { RepositoryScanPayload } from '../scan/structural-scan.js';

const BASE: RepositoryScanPayload = {
  understandingScore: 40,
  pages: [
    {
      id: 'LoginPage',
      name: 'Login',
      understandingScore: 50,
      locatorCount: 2,
    },
  ],
  flows: [],
  locators: [
    {
      id: 'l1',
      name: 'sign-in',
      strategy: 'role',
      selector: 'Sign in',
      pageName: 'LoginPage',
      confidence: 0.85,
    },
  ],
  conventions: {},
  fileTree: [],
  stats: { tests: 3, pages: 1, pageObjects: 1, utils: 0, flows: 0 },
};

describe('enrichRepositoryIndex', () => {
  it('adds page descriptions, flows, and raises understanding score', () => {
    const enriched = enrichRepositoryIndex(BASE, { repoRoot: '/tmp' });
    assert.ok(enriched.pages[0]?.description);
    assert.ok(enriched.flows.length >= 1);
    assert.ok(enriched.understandingScore > 0);
    assert.ok((enriched.locators[0]?.confidence ?? 0) >= 0.9);
  });
});
