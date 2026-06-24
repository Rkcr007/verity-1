import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runMavenTest } from './index.js';

describe('execution-engine', () => {
  it('exports runMavenTest', () => {
    assert.equal(typeof runMavenTest, 'function');
  });
});
