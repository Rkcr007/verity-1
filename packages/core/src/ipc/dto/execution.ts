import type { WorkspaceId } from '../../ids.js';
import type { RunId } from '../../ids.js';

export type ExecutionStepEventType =
  | 'step.started'
  | 'step.passed'
  | 'step.failed'
  | 'run.completed';

export interface ExecutionStepEventPayload {
  readonly runId: RunId;
  readonly type: ExecutionStepEventType;
  readonly stepId: number;
  readonly duration?: number;
  readonly errorMessage?: string;
}

export interface ExecutionStartedPayload {
  readonly runId: RunId;
  readonly projectId: WorkspaceId;
  readonly semanticTestSlug: string;
}

export type ExecutionOutcome = 'passed' | 'failed' | 'cancelled';

export interface ExecutionCompletedPayload {
  readonly runId: RunId;
  readonly projectId: WorkspaceId;
  readonly outcome: ExecutionOutcome;
}

export type FailureClassificationType =
  | 'application-bug'
  | 'test-defect'
  | 'locator-drift'
  | 'environment'
  | 'unknown';

export interface ExecutionClassifiedPayload {
  readonly runId: RunId;
  readonly projectId: WorkspaceId;
  readonly type: FailureClassificationType;
  readonly confidence: number;
  readonly summary: string;
}
