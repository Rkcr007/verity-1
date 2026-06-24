import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { installToolchainForAdapter } from './index.js';

describe('installToolchainForAdapter', () => {
  it('returns skipped result for unknown adapters', () => {
    const result = installToolchainForAdapter('selenium-python');

    assert.equal(result.ready, false);
    assert.ok(result.steps.length >= 1);
    assert.match(result.steps[0]?.detail ?? '', /No bundled install/);
  });
});
