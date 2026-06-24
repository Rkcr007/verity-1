import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findDependency, parsePom } from '../parsers/pom.js';
import { detectBestFramework } from '../registry.js';

/** Ignored when deciding if a folder is empty for greenfield scaffold. */
const EMPTY_IGNORE = new Set(['.DS_Store', '.git', '.verity', 'Thumbs.db']);

export type FolderEntryKind = 'empty' | 'playwright-java' | 'selenium-java' | 'unknown';

export type SuggestedWizardMode = 'greenfield' | 'existing' | 'migrate';

export interface FolderInspection {
  readonly path: string;
  readonly isEmpty: boolean;
  readonly entryKind: FolderEntryKind;
  readonly suggestedMode: SuggestedWizardMode;
  readonly headline: string;
  readonly detail: string;
}

/**
 * Returns true when the folder has no meaningful project files (M1.5 greenfield gate).
 */
export function isFolderEmpty(folderPath: string): boolean {
  let entries: string[];
  try {
    entries = readdirSync(folderPath);
  } catch {
    return false;
  }
  const meaningful = entries.filter(
    (entry) => !EMPTY_IGNORE.has(entry) && !entry.startsWith('.'),
  );
  return meaningful.length === 0;
}

/**
 * Lightweight Selenium Java signal detection for migration routing (no adapter yet).
 */
export function detectSeleniumJavaSignals(repoRoot: string): { detected: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const pomPath = join(repoRoot, 'pom.xml');
  if (!existsSync(pomPath)) {
    return { detected: false, reasons };
  }

  const manifest = parsePom(readFileSync(pomPath, 'utf8'));
  const seleniumArtifacts = [
    ['org.seleniumhq.selenium', 'selenium-java'],
    ['org.seleniumhq.selenium', 'selenium-chrome-driver'],
    ['org.seleniumhq.selenium', 'selenium-api'],
  ] as const;

  for (const [group, artifact] of seleniumArtifacts) {
    const dep = findDependency(manifest, group, artifact);
    if (dep) {
      reasons.push(`Maven dependency ${group}:${artifact}`);
      return { detected: true, reasons };
    }
  }

  const deps = manifest.dependencies ?? [];
  for (const dep of deps) {
    const artifactId = dep.artifactId?.toLowerCase() ?? '';
    if (artifactId.includes('selenium') || artifactId.includes('webdriver')) {
      reasons.push(`Maven artifact ${dep.artifactId}`);
      return { detected: true, reasons };
    }
  }

  return { detected: false, reasons };
}

/**
 * Inspects a local folder and recommends the best Verity entry path (M1.5).
 */
export function inspectFolder(folderPath: string): FolderInspection {
  const path = folderPath.trim();

  if (isFolderEmpty(path)) {
    return {
      path,
      isEmpty: true,
      entryKind: 'empty',
      suggestedMode: 'greenfield',
      headline: 'Empty folder — perfect for a fresh start',
      detail:
        'Verity will scaffold your chosen enterprise framework here with page objects and semantic tests.',
    };
  }

  const selenium = detectSeleniumJavaSignals(path);
  if (selenium.detected) {
    return {
      path,
      isEmpty: false,
      entryKind: 'selenium-java',
      suggestedMode: 'migrate',
      headline: 'Selenium Java project detected',
      detail:
        'Verity can index your existing tests and guide an incremental migration to Playwright Java.',
    };
  }

  const outcome = detectBestFramework(path);
  if (outcome.detection.detected && outcome.framework.adapterId === 'playwright-java') {
    return {
      path,
      isEmpty: false,
      entryKind: 'playwright-java',
      suggestedMode: 'existing',
      headline: 'Playwright Java project ready to connect',
      detail: 'Connect to analyze page objects, flows, locators, and existing tests.',
    };
  }

  return {
    path,
    isEmpty: false,
    entryKind: 'unknown',
    suggestedMode: 'existing',
    headline: 'Existing folder',
    detail:
      'Verity will scan for a supported framework. If none is found, you can scaffold Playwright Java in place.',
  };
}

export interface EntryRecommendation {
  readonly mode: SuggestedWizardMode | 'demo';
  readonly headline: string;
  readonly reasons: readonly string[];
  readonly confidence: number;
}

/**
 * Rule-based entry recommendation (no LLM) for Welcome and wizard routing.
 */
export function recommendEntry(
  inspection: FolderInspection | null,
  intent: 'welcome' | 'folder-picked' = 'welcome',
): EntryRecommendation {
  if (inspection) {
    if (inspection.suggestedMode === 'greenfield') {
      return {
        mode: 'greenfield',
        headline: 'Start fresh with Playwright Java',
        reasons: [inspection.headline, inspection.detail],
        confidence: 0.95,
      };
    }
    if (inspection.suggestedMode === 'migrate') {
      return {
        mode: 'migrate',
        headline: 'Migrate from Selenium Java',
        reasons: [inspection.headline, ...detectSeleniumJavaSignals(inspection.path).reasons],
        confidence: 0.88,
      };
    }
    if (inspection.entryKind === 'playwright-java') {
      return {
        mode: 'existing',
        headline: 'Connect this Playwright Java repo',
        reasons: [inspection.headline],
        confidence: 0.92,
      };
    }
  }

  if (intent === 'welcome') {
    return {
      mode: 'demo',
      headline: 'Try the demo workspace first',
      reasons: [
        'Explore AI Studio and repository intelligence without connecting your company repo.',
        'Sample e-commerce project with page objects and semantic tests.',
      ],
      confidence: 0.7,
    };
  }

  return {
    mode: 'existing',
    headline: 'Connect and analyze',
    reasons: ['Scan the repository for supported test frameworks.'],
    confidence: 0.5,
  };
}
