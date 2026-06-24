import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAMEWORK_CATALOG,
  getCatalogEntry,
  getScaffoldableFrameworks,
} from './framework-catalog.js';
import { recommendFramework } from './recommend-framework.js';

describe('framework catalog', () => {
  it('includes Playwright Java and TypeScript as scaffoldable', () => {
    assert.equal(getCatalogEntry('playwright-java')?.scaffoldSupported, true);
    assert.equal(getCatalogEntry('playwright-typescript')?.scaffoldSupported, true);
  });

  it('returns only scaffoldable entries', () => {
    const scaffoldable = getScaffoldableFrameworks();
    assert.ok(scaffoldable.every((e) => e.scaffoldSupported));
    assert.ok(scaffoldable.length >= 2);
  });

  it('covers all adapter ids in catalog', () => {
    assert.ok(FRAMEWORK_CATALOG.length >= 5);
  });
});

describe('recommendFramework', () => {
  it('recommends Playwright Java for greenfield Java signal', () => {
    const rec = recommendFramework({
      mode: 'greenfield',
      appDescription: 'Enterprise Java Spring banking portal',
    });
    assert.equal(rec.recommended.adapterId, 'playwright-java');
    assert.ok(rec.confidence > 0.8);
  });

  it('recommends Playwright TypeScript for frontend signal', () => {
    const rec = recommendFramework({
      mode: 'greenfield',
      appDescription: 'React Next.js frontend app',
      languagePreference: 'typescript',
    });
    assert.equal(rec.recommended.adapterId, 'playwright-typescript');
  });

  it('uses detected stack for existing connect mode', () => {
    const rec = recommendFramework(
      { mode: 'existing' },
      {
        path: '/tmp/repo',
        entryKind: 'playwright-java',
        detectedAdapterId: 'playwright-java',
        detectedFramework: {
          adapterId: 'playwright-java',
          version: '1.49.0',
          buildTool: 'maven',
          testFramework: 'JUnit 5',
          pattern: 'page-object-model',
        },
        seleniumDetected: false,
        seleniumReasons: [],
        detectionReasons: ['playwright dependency in pom.xml'],
        confidence: 0.9,
      },
    );
    assert.equal(rec.recommended.adapterId, 'playwright-java');
    assert.ok(rec.confidence >= 0.85);
  });

  it('recommends Playwright Java target for migrate with selenium signals', () => {
    const rec = recommendFramework(
      { mode: 'migrate' },
      {
        path: '/tmp/selenium',
        entryKind: 'selenium-java',
        detectedAdapterId: 'selenium-java',
        detectedFramework: null,
        seleniumDetected: true,
        seleniumReasons: ['Maven dependency org.seleniumhq.selenium:selenium-java'],
        detectionReasons: [],
        confidence: 0.88,
      },
    );
    assert.equal(rec.recommended.adapterId, 'playwright-java');
    assert.ok(rec.reasons.some((r) => r.includes('Selenium')));
  });
});
