import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  effectiveDependencies,
  findDependency,
  parsePom,
} from './parsers/pom.js';
import { PlaywrightJavaDetector } from './detectors/java-stack-detector.js';
import { detectBestFramework } from './registry.js';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SAMPLE_POM = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <properties>
    <playwright.version>1.48.0</playwright.version>
    <junit.version>5.10.2</junit.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>com.microsoft.playwright</groupId>
      <artifactId>playwright</artifactId>
      <version>\${playwright.version}</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>\${junit.version}</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`;

describe('parsePom', () => {
  it('resolves property placeholders in dependency versions', () => {
    const manifest = parsePom(SAMPLE_POM);
    const playwright = findDependency(manifest, 'com.microsoft.playwright', 'playwright');
    assert.equal(playwright?.version, '1.48.0');
    assert.equal(effectiveDependencies(manifest).length, 2);
  });
});

describe('PlaywrightJavaDetector', () => {
  it('detects Playwright Java from pom.xml', () => {
    const root = mkdtempSync(join(tmpdir(), 'verity-pw-java-'));
    writeFileSync(join(root, 'pom.xml'), SAMPLE_POM);
    mkdirSync(join(root, 'src', 'test', 'java', 'pages'), { recursive: true });
    writeFileSync(join(root, 'src', 'test', 'java', 'pages', 'LoginPage.java'), 'class LoginPage {}');

    const outcome = detectBestFramework(root);
    assert.equal(outcome.detection.detected, true);
    assert.equal(outcome.framework.adapterId, 'playwright-java');
    assert.equal(outcome.framework.version, '1.48.0');
    assert.equal(outcome.framework.buildTool, 'maven');
    assert.equal(outcome.framework.testFramework, 'JUnit 5');
    assert.equal(outcome.framework.pattern, 'page-object-model');
    assert.ok(outcome.detection.confidence >= 0.8);
  });

  it('returns not detected when no manifests match', () => {
    const root = mkdtempSync(join(tmpdir(), 'verity-empty-'));
    const detector = new PlaywrightJavaDetector();
    const result = detector.detect(root);
    assert.equal(result.detected, false);
  });
});
