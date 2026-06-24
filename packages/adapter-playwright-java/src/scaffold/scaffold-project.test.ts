import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scaffoldPlaywrightJava } from './scaffold-project.js';

describe('scaffoldPlaywrightJava', () => {
  it('writes pom, java sources, and semantic yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verity-scaffold-'));
    try {
      const result = scaffoldPlaywrightJava(dir, { projectName: 'shop-e2e' });
      assert.ok(result.filesCreated >= 5);
      assert.equal(result.framework.adapterId, 'playwright-java');
      const pom = readFileSync(join(dir, 'pom.xml'), 'utf8');
      assert.match(pom, /playwright/);
      assert.ok(readFileSync(join(dir, '.verity/tests/smoke-login.yaml'), 'utf8').includes('smoke-login'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
