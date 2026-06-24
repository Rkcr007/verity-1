import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inspectFolder, isFolderEmpty } from './folder-inspect.js';

describe('folder inspect', () => {
  it('detects empty folders for greenfield', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verity-empty-'));
    try {
      assert.equal(isFolderEmpty(dir), true);
      const inspection = inspectFolder(dir);
      assert.equal(inspection.suggestedMode, 'greenfield');
      assert.equal(inspection.isEmpty, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects playwright java pom', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verity-pw-'));
    try {
      writeFileSync(
        join(dir, 'pom.xml'),
        `<project><dependencies>
          <dependency><groupId>com.microsoft.playwright</groupId><artifactId>playwright</artifactId><version>1.49.0</version></dependency>
        </dependencies></project>`,
      );
      const inspection = inspectFolder(dir);
      assert.equal(inspection.entryKind, 'playwright-java');
      assert.equal(inspection.suggestedMode, 'existing');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects selenium java pom', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verity-se-'));
    try {
      writeFileSync(
        join(dir, 'pom.xml'),
        `<project><dependencies>
          <dependency><groupId>org.seleniumhq.selenium</groupId><artifactId>selenium-java</artifactId><version>4.25.0</version></dependency>
        </dependencies></project>`,
      );
      const inspection = inspectFolder(dir);
      assert.equal(inspection.entryKind, 'selenium-java');
      assert.equal(inspection.suggestedMode, 'migrate');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
