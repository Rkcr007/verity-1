import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Framework, TestPattern } from '@verity/core';
import {
  detectedFramework,
  notDetected,
  type DetectionResult,
} from '@verity/adapter-contract';
import type { AdapterDetector } from '../adapter-detector.js';
import { parseGradleBuild } from '../parsers/gradle.js';
import { effectiveDependencies, findDependency, parsePom } from '../parsers/pom.js';
import { countPageObjectFiles } from '../walk.js';

const PLAYWRIGHT_GROUP = 'com.microsoft.playwright';

/**
 * Detect Playwright Java via Maven/Gradle manifests and Java page-object layout (E1-S2 T4).
 */
export class PlaywrightJavaDetector implements AdapterDetector {
  readonly id = 'playwright-java';
  readonly name = 'Playwright Java';

  detect(repoRoot: string): DetectionResult {
    const reasons: string[] = [];
    let confidence = 0;
    let buildTool: Framework['buildTool'] = 'unknown';
    let version = 'unknown';
    let testFramework = 'unknown';
    let pattern: TestPattern = 'unknown';

    const pomPath = join(repoRoot, 'pom.xml');
    if (existsSync(pomPath)) {
      const manifest = parsePom(readFileSync(pomPath, 'utf8'));
      buildTool = 'maven';
      reasons.push('Found pom.xml');

      const playwright = findDependency(manifest, PLAYWRIGHT_GROUP, 'playwright');
      if (playwright) {
        confidence += 0.75;
        version = playwright.version ?? version;
        reasons.push(`Maven dependency ${PLAYWRIGHT_GROUP}:playwright`);
        if (playwright.version) {
          reasons.push(`Playwright version ${playwright.version}`);
        }
      }

      const junit5 = findDependency(manifest, 'org.junit.jupiter', 'junit-jupiter');
      const junit4 = findDependency(manifest, 'junit', 'junit');
      if (junit5) {
        testFramework = 'JUnit 5';
        confidence += 0.08;
        reasons.push('JUnit Jupiter on classpath');
      } else if (junit4) {
        testFramework = 'JUnit 4';
        confidence += 0.05;
        reasons.push('JUnit 4 on classpath');
      }

      const depCount = effectiveDependencies(manifest).length;
      if (depCount > 0) {
        reasons.push(`${depCount} Maven dependencies indexed`);
      }
    }

    const gradlePaths = ['build.gradle', 'build.gradle.kts'].map((f) => join(repoRoot, f));
    const gradlePath = gradlePaths.find((p) => existsSync(p));
    if (gradlePath) {
      const gradle = parseGradleBuild(readFileSync(gradlePath, 'utf8'));
      buildTool = buildTool === 'maven' ? buildTool : 'gradle';
      reasons.push(`Found ${gradlePath.endsWith('.kts') ? 'build.gradle.kts' : 'build.gradle'}`);

      if (gradle.hasPlaywright) {
        confidence = Math.max(confidence, 0.72);
        if (gradle.playwrightVersion) {
          version = gradle.playwrightVersion;
          reasons.push(`Gradle Playwright ${gradle.playwrightVersion}`);
        } else {
          reasons.push('Gradle declares Playwright');
        }
      }
      if (gradle.hasJUnit5 && testFramework === 'unknown') {
        testFramework = 'JUnit 5';
        confidence += 0.05;
      }
    }

    const pageObjects = countPageObjectFiles(repoRoot);
    if (pageObjects > 0) {
      pattern = 'page-object-model';
      confidence += Math.min(0.12, pageObjects * 0.03);
      reasons.push(`${pageObjects} *Page.java file(s)`);
    }

    if (confidence < 0.5) {
      return notDetected(
        reasons.length > 0
          ? reasons
          : ['No Playwright Java build manifest or page objects found'],
      );
    }

    const framework: Framework = {
      adapterId: 'playwright-java',
      version,
      buildTool,
      testFramework,
      pattern,
    };

    return detectedFramework(framework, Math.min(confidence, 0.98), reasons);
  }
}
