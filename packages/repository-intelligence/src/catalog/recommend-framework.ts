import type { AdapterId } from '@verity/core';
import {
  FRAMEWORK_CATALOG,
  getCatalogEntry,
  type FrameworkCatalogEntry,
} from './framework-catalog.js';
import type { RepoFrameworkSignals } from '../analyze/repo-signals.js';

export type RecommendFrameworkMode = 'greenfield' | 'migrate' | 'existing';

export interface RecommendFrameworkInput {
  readonly mode: RecommendFrameworkMode;
  readonly appDescription?: string;
  readonly languagePreference?: 'java' | 'typescript' | 'python' | 'javascript';
  readonly repoPath?: string;
}

export interface FrameworkRecommendation {
  readonly recommended: FrameworkCatalogEntry;
  readonly alternatives: readonly FrameworkCatalogEntry[];
  readonly reasons: readonly string[];
  readonly confidence: number;
}

const JAVA_SIGNALS =
  /\b(java|spring|maven|gradle|junit|testng|enterprise|bank|insurance|backend)\b/i;
const TS_SIGNALS = /\b(react|next\.?js|typescript|node|frontend|spa|vue|angular)\b/i;
const PYTHON_SIGNALS = /\b(python|django|flask|pytest|data|ml|platform)\b/i;

/**
 * Rule-based framework recommendation for greenfield / migrate / connect flows (M1.6+).
 * Pass repoSignals for connect/migrate intelligence from detected stack.
 */
export function recommendFramework(
  input: RecommendFrameworkInput,
  repoSignals: RepoFrameworkSignals | null = null,
): FrameworkRecommendation {
  if (input.mode === 'migrate') {
    return migrateRecommendation(repoSignals);
  }

  if (input.mode === 'existing') {
    return existingRecommendation(repoSignals);
  }

  return greenfieldRecommendation(input);
}

function migrateRecommendation(signals: RepoFrameworkSignals | null): FrameworkRecommendation {
  const target = requireEntry('playwright-java');
  const reasons: string[] = [];

  if (signals?.seleniumDetected) {
    reasons.push('Selenium Java detected in repository — incremental migration to Playwright Java.');
    if (signals.seleniumReasons.length > 0) {
      reasons.push(`Signals: ${signals.seleniumReasons.join(', ')}`);
    }
  } else {
    reasons.push('Migration path assumes a Selenium Java source estate.');
  }

  reasons.push('Verity transpiles semantic tests to Playwright Java with review-gated apply.');
  reasons.push('Keep Selenium running in CI while Playwright coverage grows flow-by-flow.');

  const confidence = signals?.seleniumDetected ? 0.94 : 0.72;

  return {
    recommended: target,
    alternatives: [requireEntry('selenium-java')],
    reasons,
    confidence,
  };
}

function existingRecommendation(signals: RepoFrameworkSignals | null): FrameworkRecommendation {
  if (signals?.detectedAdapterId) {
    const detected = getCatalogEntry(signals.detectedAdapterId);
    if (detected) {
      const reasons = [
        `Detected ${detected.displayName} from repository build files.`,
        ...signals.detectionReasons.slice(0, 2),
        'Verity will index page objects, flows, and locators for AI collaboration.',
      ];
      return {
        recommended: detected,
        alternatives: rankAlternatives(detected.adapterId, inferLangFromSignals(signals)),
        reasons,
        confidence: Math.max(signals.confidence, 0.85),
      };
    }
  }

  if (signals?.seleniumDetected) {
    return {
      recommended: requireEntry('selenium-java'),
      alternatives: [requireEntry('playwright-java')],
      reasons: [
        'Selenium Java detected — connect to index, or switch to Migrate for Playwright target.',
        ...signals.seleniumReasons,
      ],
      confidence: 0.88,
    };
  }

  const fallback = requireEntry('playwright-java');
  return {
    recommended: fallback,
    alternatives: FRAMEWORK_CATALOG.filter((e) => e.adapterId !== fallback.adapterId).slice(0, 3),
    reasons: [
      'No supported framework detected yet — scan will run after connect.',
      'Playwright Java and TypeScript are fully supported when detected.',
    ],
    confidence: 0.65,
  };
}

function greenfieldRecommendation(input: RecommendFrameworkInput): FrameworkRecommendation {
  const desc = input.appDescription?.trim() ?? '';
  const lang = input.languagePreference ?? inferLanguage(desc);

  let recommendedId: AdapterId = 'playwright-java';
  const reasons: string[] = [];

  switch (lang) {
    case 'typescript':
    case 'javascript':
      recommendedId = 'playwright-typescript';
      reasons.push('TypeScript/JavaScript signal — Playwright Test is the modern enterprise default.');
      break;
    case 'python':
      recommendedId = 'selenium-python';
      reasons.push('Python signal detected — pytest + Selenium is common for platform teams.');
      break;
    case 'java':
    default:
      recommendedId = 'playwright-java';
      reasons.push('Java is the enterprise standard for large regulated QA organizations.');
      reasons.push(
        'Playwright Java leads in speed, auto-waiting, and CI parallelism vs legacy WebDriver.',
      );
      break;
  }

  const recommended = requireEntry(recommendedId);
  if (!recommended.scaffoldSupported) {
    const fallback =
      lang === 'typescript' || lang === 'javascript'
        ? requireEntry('playwright-typescript')
        : requireEntry('playwright-java');
    reasons.push(`${recommended.displayName} scaffold ships soon — using ${fallback.displayName} today.`);
    return {
      recommended: fallback,
      alternatives: rankAlternatives(fallback.adapterId, lang),
      reasons,
      confidence: 0.88,
    };
  }

  if (desc.length > 0) {
    reasons.push(`Tailored from your app description: "${truncate(desc, 80)}"`);
  }

  const depNote =
    recommended.adapterId === 'playwright-typescript'
      ? 'Verity installs Node, npm dependencies, and Playwright browsers for you.'
      : 'Verity installs JDK, Maven, dependencies, and Playwright browsers for you.';
  reasons.push(depNote);

  return {
    recommended,
    alternatives: rankAlternatives(recommended.adapterId, lang),
    reasons,
    confidence: desc.length > 0 ? 0.91 : 0.85,
  };
}

function inferLangFromSignals(
  signals: RepoFrameworkSignals,
): 'java' | 'typescript' | 'python' | 'javascript' {
  if (signals.detectedAdapterId === 'playwright-typescript' || signals.detectedAdapterId === 'cypress') {
    return 'typescript';
  }
  if (signals.detectedAdapterId === 'selenium-python') {
    return 'python';
  }
  return 'java';
}

function inferLanguage(description: string): 'java' | 'typescript' | 'python' | 'javascript' {
  if (PYTHON_SIGNALS.test(description)) return 'python';
  if (TS_SIGNALS.test(description)) return 'typescript';
  if (JAVA_SIGNALS.test(description)) return 'java';
  return 'java';
}

function rankAlternatives(
  excludeId: AdapterId,
  lang: 'java' | 'typescript' | 'python' | 'javascript',
): readonly FrameworkCatalogEntry[] {
  const priority: Record<string, AdapterId[]> = {
    java: ['playwright-typescript', 'selenium-java', 'cypress'],
    typescript: ['playwright-java', 'cypress', 'selenium-java'],
    javascript: ['playwright-typescript', 'playwright-java', 'cypress'],
    python: ['playwright-java', 'selenium-java', 'playwright-typescript'],
  };

  const ids = priority[lang] ?? priority.java ?? [];
  return ids
    .filter((id) => id !== excludeId)
    .map((id) => getCatalogEntry(id))
    .filter((e): e is FrameworkCatalogEntry => e !== null)
    .slice(0, 3);
}

function requireEntry(adapterId: AdapterId): FrameworkCatalogEntry {
  const entry = getCatalogEntry(adapterId);
  if (!entry) {
    throw new Error(`Catalog missing adapter ${adapterId}`);
  }
  return entry;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export type { RepoFrameworkSignals } from '../analyze/repo-signals.js';
