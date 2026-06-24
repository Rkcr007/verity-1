import type { Framework } from '@verity/core';

/**
 * Result of adapter framework detection against a repository root.
 */
export interface DetectionResult {
  readonly detected: boolean;
  /** Confidence score 0–1. */
  readonly confidence: number;
  readonly framework?: Framework;
  /** Human-readable reasons (matched files, dependencies, etc.). */
  readonly reasons: readonly string[];
}

/** Convenience builder for a positive detection. */
export function detectedFramework(
  framework: Framework,
  confidence: number,
  reasons: readonly string[],
): DetectionResult {
  return { detected: true, confidence, framework, reasons };
}

/** Convenience builder for a negative detection. */
export function notDetected(reasons: readonly string[]): DetectionResult {
  return { detected: false, confidence: 0, reasons };
}

/** Pick the best detection from multiple adapter probes. */
export function pickBestDetection(results: readonly DetectionResult[]): DetectionResult | null {
  const candidates = results.filter((r) => r.detected && r.framework);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) =>
    current.confidence > best.confidence ? current : best,
  );
}

