import type { Framework } from '@verity/core';
import {
  pickBestDetection,
  type DetectionResult,
} from '@verity/adapter-contract';
import { PlaywrightJavaDetector } from './detectors/java-stack-detector.js';
import { PlaywrightTypeScriptDetector } from './detectors/npm-stack-detector.js';

const DEFAULT_DETECTORS = [
  new PlaywrightJavaDetector(),
  new PlaywrightTypeScriptDetector(),
] as const;

const UNKNOWN_FRAMEWORK: Framework = {
  adapterId: 'playwright-java',
  version: 'unknown',
  buildTool: 'unknown',
  testFramework: 'unknown',
  pattern: 'unknown',
};

export interface FrameworkDetectionOutcome {
  readonly framework: Framework;
  readonly detection: DetectionResult;
}

/**
 * Run all registered adapter detectors and return the best match.
 */
export function detectBestFramework(repoRoot: string): FrameworkDetectionOutcome {
  const results = DEFAULT_DETECTORS.map((detector) => detector.detect(repoRoot));
  const best = pickBestDetection(results);

  if (best?.framework) {
    return { framework: best.framework, detection: best };
  }

  const reasons = results.flatMap((r) => r.reasons);
  return {
    framework: UNKNOWN_FRAMEWORK,
    detection: {
      detected: false,
      confidence: 0,
      reasons: reasons.length > 0 ? reasons : ['No supported test framework detected'],
    },
  };
}

/** @deprecated Use {@link detectBestFramework} — kept for desktop import compatibility. */
export function detectFramework(repoRoot: string): Framework {
  return detectBestFramework(repoRoot).framework;
}

export { DEFAULT_DETECTORS };
