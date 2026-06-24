import type { AdapterId } from '@verity/core';
import type { TestAdapter } from '@verity/adapter-contract';
import {
  runCompleted,
  type ExecutionConfig,
  type ExecutionEvent,
} from '@verity/adapter-contract';
import type { RepositoryIndexSnapshot } from '@verity/adapter-contract';
import type { SemanticTest } from '@verity/semantic-model';
import { PlaywrightTypeScriptDetector } from '@verity/repository-intelligence';
import { checkPlaywrightTypeScriptPrerequisites } from './prerequisites.js';
import { transpileSemanticTest } from './transpile/transpile-test.js';

const detector = new PlaywrightTypeScriptDetector();

/**
 * Playwright TypeScript TestAdapter (M1.7).
 */
export class PlaywrightTypeScriptAdapter implements TestAdapter {
  readonly id: AdapterId = 'playwright-typescript';
  readonly name = 'Playwright TypeScript';
  readonly version = '1.0.0';

  detect(repoRoot: string) {
    return detector.detect(repoRoot);
  }

  transpile(test: SemanticTest, index: RepositoryIndexSnapshot) {
    return transpileSemanticTest(test, index);
  }

  checkPrerequisites(repoRoot: string) {
    return checkPlaywrightTypeScriptPrerequisites(repoRoot);
  }

  async *run(
    _test: SemanticTest,
    _config: ExecutionConfig,
    _repoRoot: string,
  ): AsyncIterable<ExecutionEvent> {
    yield runCompleted('cancelled');
  }
}

export const playwrightTypeScriptAdapter = new PlaywrightTypeScriptAdapter();
