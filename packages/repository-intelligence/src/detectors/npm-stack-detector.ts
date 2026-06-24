import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Framework } from '@verity/core';
import {
  detectedFramework,
  notDetected,
  type DetectionResult,
} from '@verity/adapter-contract';
import type { AdapterDetector } from '../adapter-detector.js';
import { allDependencies, parsePackageJson } from '../parsers/package-json.js';
import { countTypeScriptPageObjectFiles } from '../walk.js';

/**
 * Detect Playwright TypeScript via package.json (E1-S2 T2 — future adapter path).
 */
export class PlaywrightTypeScriptDetector implements AdapterDetector {
  readonly id = 'playwright-typescript';
  readonly name = 'Playwright TypeScript';

  detect(repoRoot: string): DetectionResult {
    const packagePath = join(repoRoot, 'package.json');
    if (!existsSync(packagePath)) {
      return notDetected(['No package.json']);
    }

    const manifest = parsePackageJson(readFileSync(packagePath, 'utf8'));
    if (!manifest) {
      return notDetected(['package.json is not valid JSON']);
    }

    const deps = allDependencies(manifest);
    const playwrightTest = deps['@playwright/test'];
    const playwright = deps.playwright;
    if (!playwrightTest && !playwright) {
      return notDetected(['No @playwright/test or playwright dependency']);
    }

    const reasons = [
      playwrightTest ? '@playwright/test in package.json' : 'playwright in package.json',
    ];
    let confidence = 0.82;

    const pageObjects = countTypeScriptPageObjectFiles(repoRoot);
    const pattern = pageObjects > 0 ? 'page-object-model' : 'unknown';
    if (pageObjects > 0) {
      reasons.push(`${pageObjects} TypeScript page object file(s)`);
      confidence += 0.05;
    }

    const framework: Framework = {
      adapterId: 'playwright-typescript',
      version: playwrightTest ?? playwright ?? 'unknown',
      buildTool: existsSync(join(repoRoot, 'pnpm-lock.yaml'))
        ? 'pnpm'
        : existsSync(join(repoRoot, 'yarn.lock'))
          ? 'npm'
          : 'npm',
      testFramework: 'Playwright Test',
      pattern,
    };

    return detectedFramework(framework, Math.min(confidence, 0.95), reasons);
  }
}
