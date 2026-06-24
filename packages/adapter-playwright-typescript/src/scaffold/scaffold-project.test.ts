import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scaffoldPlaywrightTypeScript } from './scaffold-project.js';

describe('scaffoldPlaywrightTypeScript', () => {
  it('writes package.json, specs, and semantic yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verity-scaffold-ts-'));
    try {
      const result = scaffoldPlaywrightTypeScript(dir, { projectName: 'shop-e2e' });
      assert.ok(result.filesCreated >= 6);
      assert.equal(result.framework.adapterId, 'playwright-typescript');
      const pkg = readFileSync(join(dir, 'package.json'), 'utf8');
      assert.match(pkg, /@playwright\/test/);
      assert.ok(readFileSync(join(dir, '.verity/tests/smoke-login.yaml'), 'utf8').includes('smoke-login'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
