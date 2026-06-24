import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { applyIncrementalChanges } from './incremental-index.js';
import { scanRepositoryStructure } from './structural-scan.js';

describe('applyIncrementalChanges', () => {
  it('merges a modified Java page object into the cached index', () => {
    const root = mkdtempSync(join(tmpdir(), 'verity-inc-'));
    const pageDir = join(root, 'src', 'test', 'java', 'pages');
    mkdirSync(pageDir, { recursive: true });
    const pagePath = join(pageDir, 'LoginPage.java');
    writeFileSync(
      pagePath,
      `class LoginPage { void m() { page.getByRole("button"); } }`,
    );

    const initial = scanRepositoryStructure(root);
    assert.equal(initial.payload.locators.length, 1);

    writeFileSync(
      pagePath,
      `class LoginPage { void m() { page.getByRole("button"); page.getByPlaceholder("Email"); } }`,
    );

    const updated = applyIncrementalChanges(root, initial.payload, [
      { path: 'src/test/java/pages/LoginPage.java', changeType: 'modified' },
    ]);

    assert.equal(updated.payload.locators.length, 2);
    assert.equal(updated.payload.pages.length, 1);
    assert.ok(updated.payload.understandingScore >= initial.payload.understandingScore);
  });

  it('removes locators and pages when a Java file is deleted', () => {
    const root = mkdtempSync(join(tmpdir(), 'verity-inc-'));
    const pageDir = join(root, 'src', 'test', 'java', 'pages');
    mkdirSync(pageDir, { recursive: true });
    const pagePath = join(pageDir, 'LoginPage.java');
    writeFileSync(
      pagePath,
      `class LoginPage { void m() { page.getByRole("button"); } }`,
    );

    const initial = scanRepositoryStructure(root);
    unlinkSync(pagePath);

    const updated = applyIncrementalChanges(root, initial.payload, [
      { path: 'src/test/java/pages/LoginPage.java', changeType: 'deleted' },
    ]);

    assert.equal(updated.payload.pages.length, 0);
    assert.equal(updated.payload.locators.length, 0);
    assert.equal(updated.payload.stats.flows, 0);
  });
});
