import type { AdapterId } from './framework.js';

/**
 * ProjectSettings — the four Settings groups from the prototype (resolution M-03).
 * Persisted as a JSON column on `projects` (resolution D-02). Defined in core so
 * both processes share the shape; values are display/behavioral config only.
 */
export interface GitSettings {
  readonly commitAuthor: string;
  /** Human review before commit is enforced and cannot be disabled in MVP (§Settings). */
  readonly requireReviewBeforeCommit: true;
  readonly openPullRequests: boolean;
  readonly branchPrefix: string;
}

export interface ExecutionSettings {
  readonly runLocation: 'local';
  readonly browser: 'chromium' | 'firefox' | 'webkit';
  readonly headless: boolean;
  readonly parallelWorkers: number;
  readonly captureEvidence: boolean;
}

export interface AiSettings {
  readonly model: string;
  readonly fullRepositoryContext: boolean;
  readonly proposeBeforeApplying: true;
  readonly localInferenceCache: boolean;
}

export interface ProjectSettings {
  readonly adapterId: AdapterId;
  readonly git: GitSettings;
  readonly execution: ExecutionSettings;
  readonly ai: AiSettings;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  adapterId: 'playwright-java',
  git: {
    commitAuthor: 'Verity (on your behalf)',
    requireReviewBeforeCommit: true,
    openPullRequests: true,
    branchPrefix: 'verity/',
  },
  execution: {
    runLocation: 'local',
    browser: 'chromium',
    headless: false,
    parallelWorkers: 4,
    captureEvidence: true,
  },
  ai: {
    model: 'claude-sonnet-4-6',
    fullRepositoryContext: true,
    proposeBeforeApplying: true,
    localInferenceCache: true,
  },
};
