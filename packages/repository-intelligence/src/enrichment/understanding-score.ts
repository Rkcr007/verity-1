import type { IndexScanStats } from '../scan/structural-scan.js';

export interface UnderstandingScoreInput {
  readonly stats: IndexScanStats;
  readonly locatorCount: number;
  readonly enrichedPageCount: number;
  readonly flowCount: number;
}

/**
 * Deterministic understanding score (E1-S4 T4).
 * Replaced by ML-assisted scoring when ai-orchestration ships (M4).
 */
export function calculateUnderstandingScore(input: UnderstandingScoreInput): number {
  const { stats, locatorCount, enrichedPageCount, flowCount } = input;
  if (stats.tests === 0 && stats.pageObjects === 0) return 0;

  const structure = Math.min(35, stats.pageObjects * 6 + stats.tests * 1.5);
  const locators = Math.min(25, locatorCount * 2);
  const flowsScore = Math.min(20, flowCount * 4);
  const enrichment = Math.min(20, enrichedPageCount * 5);

  return Math.min(100, Math.round(structure + locators + flowsScore + enrichment));
}
