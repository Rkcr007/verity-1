import type { AdapterId } from '@verity/core';
import type { SemanticTest } from '@verity/semantic-model';
import type { DetectionResult } from './detection.js';
import type { ExecutionConfig, ExecutionEvent } from './execution.js';
import type { PrerequisiteReport } from './prerequisites.js';
import type { RepositoryIndexSnapshot } from './repository-index-snapshot.js';
import type { TranspileResult } from './transpile.js';

/**
 * TestAdapter — the ACL every framework adapter implements (AD-002, architecture §9.1).
 *
 * Adapters are the ONLY components allowed to import test-framework SDKs.
 * The core platform and semantic model remain framework-neutral.
 */
export interface TestAdapter {
  readonly id: AdapterId;
  readonly name: string;
  /** Adapter package / transpiler version (not necessarily the framework SDK version). */
  readonly version: string;

  /**
   * Probe a repository root for framework signals.
   * @param repoRoot - Absolute path to the local clone
   */
  detect(repoRoot: string): DetectionResult | Promise<DetectionResult>;

  /**
   * Deterministically project a semantic test into framework source files.
   */
  transpile(test: SemanticTest, index: RepositoryIndexSnapshot): TranspileResult;

  /**
   * Execute a semantic test locally, yielding streaming execution events.
   */
  run(
    test: SemanticTest,
    config: ExecutionConfig,
    repoRoot: string,
  ): AsyncIterable<ExecutionEvent> | Promise<AsyncIterable<ExecutionEvent>>;

  /**
   * Verify JDK, build tool, browser binaries, etc. before run.
   */
  checkPrerequisites(repoRoot: string): PrerequisiteReport | Promise<PrerequisiteReport>;
}

/** Type guard for adapter registration lists. */
export function isTestAdapter(value: unknown): value is TestAdapter {
  if (typeof value !== 'object' || value === null) return false;
  const adapter = value as TestAdapter;
  return (
    typeof adapter.id === 'string' &&
    typeof adapter.name === 'string' &&
    typeof adapter.version === 'string' &&
    typeof adapter.detect === 'function' &&
    typeof adapter.transpile === 'function' &&
    typeof adapter.run === 'function' &&
    typeof adapter.checkPrerequisites === 'function'
  );
}
