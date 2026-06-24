import type { DetectionResult } from '@verity/adapter-contract';

/**
 * Probes a repository root for a specific test adapter (E1-S2 T4).
 * Implementations live in this package; adapters reuse the same contract via TestAdapter.detect.
 */
export interface AdapterDetector {
  /** Stable adapter key — matches {@link import('@verity/core').AdapterId}. */
  readonly id: string;
  /** Human-readable label for logs and wizard copy. */
  readonly name: string;
  /**
   * Inspect build manifests and source layout for framework signals.
   * @param repoRoot - Absolute path to the local repository root
   */
  detect(repoRoot: string): DetectionResult;
}
