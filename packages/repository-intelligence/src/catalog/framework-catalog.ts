import type { AdapterId } from '@verity/core';

export type FrameworkMaturity = 'available' | 'preview' | 'planned';
export type EnterpriseTier = 'leader' | 'standard' | 'emerging';

/** Enterprise automation stack entry — powers greenfield picker and intelligence (M1.6). */
export interface FrameworkCatalogEntry {
  readonly adapterId: AdapterId;
  readonly displayName: string;
  readonly language: string;
  readonly buildTool: string;
  readonly testRunner: string;
  readonly pattern: string;
  readonly maturity: FrameworkMaturity;
  readonly enterpriseTier: EnterpriseTier;
  readonly adoptionNote: string;
  readonly latestVersion: string;
  readonly dependencies: readonly string[];
  readonly scaffoldSupported: boolean;
  readonly tags: readonly string[];
}

/** Curated enterprise stacks — ranked by adoption in Fortune 500 QA orgs (M1.6). */
export const FRAMEWORK_CATALOG: readonly FrameworkCatalogEntry[] = [
  {
    adapterId: 'playwright-java',
    displayName: 'Playwright Java',
    language: 'Java',
    buildTool: 'Maven',
    testRunner: 'JUnit 5',
    pattern: 'Page Object Model',
    maturity: 'available',
    enterpriseTier: 'leader',
    adoptionNote:
      'Fastest-growing enterprise E2E stack for Java teams — Microsoft-backed, stable locators, parallel CI.',
    latestVersion: '1.49.0',
    dependencies: ['JDK 17+', 'Apache Maven 3.8+', 'Playwright browsers'],
    scaffoldSupported: true,
    tags: ['java', 'maven', 'cross-browser', 'ci-ready', 'page-objects'],
  },
  {
    adapterId: 'playwright-typescript',
    displayName: 'Playwright TypeScript',
    language: 'TypeScript',
    buildTool: 'npm / pnpm',
    testRunner: 'Playwright Test',
    pattern: 'Fixtures + Page Objects',
    maturity: 'available',
    enterpriseTier: 'leader',
    adoptionNote:
      'Default for modern frontend teams — first-class Playwright Test runner with trace viewer.',
    latestVersion: '1.49.0',
    dependencies: ['Node.js 20+', 'npm or pnpm', 'Playwright browsers'],
    scaffoldSupported: true,
    tags: ['typescript', 'node', 'cross-browser', 'trace-viewer'],
  },
  {
    adapterId: 'selenium-java',
    displayName: 'Selenium Java',
    language: 'Java',
    buildTool: 'Maven / Gradle',
    testRunner: 'TestNG / JUnit',
    pattern: 'Page Object Model',
    maturity: 'preview',
    enterpriseTier: 'standard',
    adoptionNote:
      'Legacy standard in large enterprises — Verity supports connect + migrate to Playwright Java.',
    latestVersion: '4.27.0',
    dependencies: ['JDK 11+', 'Maven or Gradle', 'WebDriver binaries'],
    scaffoldSupported: false,
    tags: ['java', 'legacy', 'webdriver', 'migrate-source'],
  },
  {
    adapterId: 'cypress',
    displayName: 'Cypress',
    language: 'JavaScript',
    buildTool: 'npm',
    testRunner: 'Cypress Runner',
    pattern: 'Custom commands',
    maturity: 'planned',
    enterpriseTier: 'standard',
    adoptionNote: 'Popular for component + E2E in JS-heavy product teams with strong DX.',
    latestVersion: '13.17.0',
    dependencies: ['Node.js 18+', 'npm', 'Cypress binary'],
    scaffoldSupported: false,
    tags: ['javascript', 'component', 'dx'],
  },
  {
    adapterId: 'selenium-python',
    displayName: 'Selenium Python',
    language: 'Python',
    buildTool: 'pip / poetry',
    testRunner: 'pytest',
    pattern: 'Page Objects',
    maturity: 'planned',
    enterpriseTier: 'emerging',
    adoptionNote: 'Common in data/platform teams where Python is the primary language.',
    latestVersion: '4.27.0',
    dependencies: ['Python 3.10+', 'pip', 'WebDriver'],
    scaffoldSupported: false,
    tags: ['python', 'pytest', 'data-platform'],
  },
] as const;

/**
 * Returns the full enterprise framework catalog for the greenfield picker.
 */
export function getFrameworkCatalog(): readonly FrameworkCatalogEntry[] {
  return FRAMEWORK_CATALOG;
}

/**
 * Resolves a catalog entry by adapter id.
 */
export function getCatalogEntry(adapterId: AdapterId): FrameworkCatalogEntry | null {
  return FRAMEWORK_CATALOG.find((e) => e.adapterId === adapterId) ?? null;
}

/**
 * Returns entries that Verity can scaffold today.
 */
export function getScaffoldableFrameworks(): readonly FrameworkCatalogEntry[] {
  return FRAMEWORK_CATALOG.filter((e) => e.scaffoldSupported);
}
