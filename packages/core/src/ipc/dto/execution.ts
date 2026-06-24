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

export type RunStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface RunStepDto {
  readonly id: string;
  readonly stepIndex: number;
  readonly label: string;
  readonly status: RunStepStatus;
  readonly durationMs?: number;
}

export interface ExecutionRunDto {
  readonly id: RunId;
  readonly projectId: WorkspaceId;
  readonly semanticTestSlug: string;
  readonly semanticTestName: string;
  readonly branch: string;
  readonly status: ExecutionOutcome | 'running';
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly steps: readonly RunStepDto[];
  readonly classification?: {
    readonly type: FailureClassificationType;
    readonly confidence: number;
    readonly summary: string;
  };
}

export interface ExecutionRunRequest {
  readonly projectId: WorkspaceId;
  readonly semanticTestSlug: string;
  readonly headless?: boolean;
}

export interface ExecutionRunResponse {
  readonly runId: RunId;
}

export interface ExecutionCancelRequest {
  readonly runId: RunId;
}

export interface ExecutionGetRequest {
  readonly runId: RunId;
}

export interface ExecutionListRequest {
  readonly projectId: WorkspaceId;
}
