import type { BusinessFlowDto, LocatorDto, PageDto } from '@verity/core/ipc';
import type { RepositoryScanPayload } from '../scan/structural-scan.js';
import { calculateUnderstandingScore } from './understanding-score.js';

export interface EnrichmentContext {
  readonly repoRoot: string;
}

/**
 * Rule-based index enrichment (E1-S4 T1–T3).
 * Claude-backed descriptions ship in packages/ai-orchestration (M4).
 */
export function enrichRepositoryIndex(
  draft: RepositoryScanPayload,
  _context: EnrichmentContext,
): RepositoryScanPayload {
  const pages = draft.pages.map(enrichPage);
  const flows = enrichFlows(draft.flows, pages);
  const locators = draft.locators.map((loc) => ({
    ...loc,
    confidence: refineLocatorConfidence(loc),
  }));

  const understandingScore = calculateUnderstandingScore({
    stats: draft.stats,
    locatorCount: locators.length,
    enrichedPageCount: pages.filter((p) => p.description).length,
    flowCount: flows.length,
  });

  return {
    ...draft,
    pages,
    flows,
    locators,
    understandingScore,
    stats: {
      ...draft.stats,
      flows: flows.length,
    },
  };
}

function enrichPage(page: PageDto): PageDto {
  const slug = page.name.toLowerCase().replace(/\s+/g, '-');
  const description = buildPageDescription(page);
  return {
    ...page,
    url: page.url ?? `/${slug}`,
    description,
    understandingScore: Math.min(
      100,
      page.understandingScore + (page.locatorCount > 0 ? 8 : 0),
    ),
  };
}

function buildPageDescription(page: PageDto): string {
  if (page.locatorCount === 0) {
    return `${page.name} page object — structure detected, locators pending enrichment.`;
  }
  return `${page.name} screen with ${page.locatorCount} mapped locator${
    page.locatorCount === 1 ? '' : 's'
  } for Playwright Java automation.`;
}

function enrichFlows(
  flows: readonly BusinessFlowDto[],
  pages: readonly PageDto[],
): BusinessFlowDto[] {
  if (flows.length > 0) {
    return flows.map((flow) => ({
      ...flow,
      confidence: Math.min(0.98, flow.confidence + 0.05),
      stepCount: Math.max(flow.stepCount, 2),
    }));
  }

  return pages.slice(0, 6).map((page) => ({
    id: page.id,
    name: `${page.name} journey`,
    stepCount: Math.max(2, Math.min(6, page.locatorCount + 1)),
    confidence: Math.min(0.95, 0.65 + page.understandingScore / 200),
  }));
}

function refineLocatorConfidence(locator: LocatorDto): number {
  const base = locator.confidence;
  if (locator.strategy === 'role' || locator.strategy === 'placeholder') {
    return Math.min(0.99, base + 0.08);
  }
  if (locator.strategy === 'css' && locator.selector.length > 40) {
    return Math.max(0.6, base - 0.1);
  }
  return base;
}
