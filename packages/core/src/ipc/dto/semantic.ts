import type { AdapterId } from '../../models/framework.js';
import type { WorkspaceId } from '../../ids.js';
import type { ProposalId } from '../../ids.js';

/**
 * Locator reference wire shape — mirrors semantic-model v1 (kept in core so IPC
 * does not depend on semantic-model).
 */
export type LocatorStrategyDto =
  | 'role'
  | 'text'
  | 'placeholder'
  | 'css'
  | 'xpath'
  | 'id'
  | 'name'
  | 'label'
  | 'test-id';

export interface StepLocatorRefDto {
  readonly ref: string;
  readonly strategy: LocatorStrategyDto;
  readonly value: string;
  readonly invented: boolean;
}

export interface SemanticStepDto {
  readonly id: number;
  readonly intent: string;
  readonly action: string;
  readonly context: string;
  readonly expected: string;
  readonly confidence: number;
  readonly locators: readonly StepLocatorRefDto[];
}

/** Full semantic test document exchanged over IPC (YAML source of truth). */
export interface SemanticTestDto {
  readonly version: '1';
  readonly id: string;
  readonly name: string;
  readonly adapter: AdapterId;
  readonly promptVersion: string;
  readonly created: string;
  readonly modified: string;
  readonly steps: readonly SemanticStepDto[];
}

/** Runtime status shown in the workspace left panel (derived from last run in M5). */
export type SemanticTestRunStatus = 'draft' | 'pass' | 'fail';

export interface SemanticTestSummaryDto {
  readonly slug: string;
  readonly name: string;
  readonly stepCount: number;
  readonly status: SemanticTestRunStatus;
  readonly adapter: AdapterId;
}

export interface SemanticListRequest {
  readonly projectId: WorkspaceId;
}

export interface SemanticGetRequest {
  readonly projectId: WorkspaceId;
  readonly slug: string;
}

export interface SemanticWriteRequest {
  readonly projectId: WorkspaceId;
  readonly test: SemanticTestDto;
}

export interface SemanticDeleteRequest {
  readonly projectId: WorkspaceId;
  readonly slug: string;
}

export interface SemanticPreviewCodeRequest {
  readonly projectId: WorkspaceId;
  readonly test: SemanticTestDto;
}

export interface ProjectedCodeFileDto {
  readonly path: string;
  readonly content: string;
  readonly type: 'create' | 'modify';
}

export interface SemanticPreviewCodeResponse {
  readonly files: readonly ProjectedCodeFileDto[];
  readonly warnings: readonly string[];
}

export interface ProposedFileChangeDto {
  readonly path: string;
  readonly type: 'create' | 'modify';
  readonly summary?: string;
}

export interface SemanticProposalDto {
  readonly id: ProposalId;
  readonly projectId: WorkspaceId;
  readonly prompt: string;
  readonly test: SemanticTestDto;
  readonly proposedFiles: readonly ProposedFileChangeDto[];
  readonly proposalConfidence: number;
  readonly status: 'draft' | 'applied' | 'discarded';
}

export interface SemanticApplyProposalRequest {
  readonly projectId: WorkspaceId;
  readonly proposalId: ProposalId;
}

export interface SemanticDiscardProposalRequest {
  readonly projectId: WorkspaceId;
  readonly proposalId: ProposalId;
}
