import type { AdapterId } from '@verity/core';
import type { TestAdapter } from '@verity/adapter-contract';
import {
  runCompleted,
  stepFailed,
  stepPassed,
  stepStarted,
  type ExecutionConfig,
  type ExecutionEvent,
} from '@verity/adapter-contract';
import type { RepositoryIndexSnapshot } from '@verity/adapter-contract';
import type { SemanticTest } from '@verity/semantic-model';
import { runMavenTest } from '@verity/execution-engine';
import { PlaywrightJavaDetector } from '@verity/repository-intelligence';
import { semanticSlugToClassName } from './naming.js';
import { checkPlaywrightJavaPrerequisites } from './prerequisites.js';
import { transpileSemanticTest } from './transpile/transpile-test.js';

const detector = new PlaywrightJavaDetector();

/**
 * Playwright Java TestAdapter (M3 E3-S1 T1).
 */
export class PlaywrightJavaAdapter implements TestAdapter {
  readonly id: AdapterId = 'playwright-java';
  readonly name = 'Playwright Java';
  readonly version = '1.0.0';

  detect(repoRoot: string) {
    return detector.detect(repoRoot);
  }

  transpile(test: SemanticTest, index: RepositoryIndexSnapshot) {
    return transpileSemanticTest(test, index, '');
  }

  transpileInRepo(test: SemanticTest, index: RepositoryIndexSnapshot, repoRoot: string) {
    return transpileSemanticTest(test, index, repoRoot);
  }

  checkPrerequisites(repoRoot: string) {
    return checkPlaywrightJavaPrerequisites(repoRoot);
  }

  async *run(
    test: SemanticTest,
    config: ExecutionConfig,
    repoRoot: string,
  ): AsyncIterable<ExecutionEvent> {
    const className = semanticSlugToClassName(test.id);

    for (const step of test.steps) {
      yield stepStarted(step.id);
    }

    const result = await runMavenTest({
      cwd: repoRoot,
      testClass: className,
      ...(config.abortSignal ? { signal: config.abortSignal } : {}),
    });

    if (config.abortSignal?.aborted) {
      yield runCompleted('cancelled');
      return;
    }

    if (result.success) {
      const perStep = Math.max(1, Math.floor(result.durationMs / Math.max(test.steps.length, 1)));
      for (const step of test.steps) {
        yield stepPassed(step.id, perStep);
      }
      yield runCompleted('passed');
      return;
    }

    const failStep = test.steps[test.steps.length - 1]?.id ?? 1;
    const message = extractMavenError(result.stdout + result.stderr);
    yield stepFailed(failStep, { message });
    yield runCompleted('failed');
  }
}

function extractMavenError(output: string): string {
  const lines = output.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const failure = lines.find((l) => /FAILURE|ERROR|Exception|Failed/i.test(l));
  return failure ?? 'Maven test run failed.';
}

export const playwrightJavaAdapter = new PlaywrightJavaAdapter();
