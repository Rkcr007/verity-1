import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { scanRepositoryStructure } from './structural-scan.js';

describe('scanRepositoryStructure', () => {
  it('extracts page objects, locators, and file tree from Java repo', () => {
    const root = mkdtempSync(join(tmpdir(), 'verity-scan-'));
    writeFileSync(
      join(root, 'pom.xml'),
      `<project><dependencies>
        <dependency><groupId>com.microsoft.playwright</groupId><artifactId>playwright</artifactId><version>1.48</version></dependency>
      </dependencies></project>`,
    );
    mkdirSync(join(root, 'src', 'test', 'java', 'pages'), { recursive: true });
    writeFileSync(
      join(root, 'src', 'test', 'java', 'pages', 'LoginPage.java'),
      `class LoginPage { void m() { page.getByRole("button"); page.getByPlaceholder("Email"); } }`,
    );

    const result = scanRepositoryStructure(root);
    assert.equal(result.payload.pages.length, 1);
    assert.ok(result.payload.locators.length >= 2);
    assert.ok(result.payload.fileTree.length > 0);
    assert.ok(result.progress.understandingScore > 0);
  });
});
