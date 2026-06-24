import type { WorkspaceId } from '../ids.js';
import type { Framework } from '../models/framework.js';
import type { WorkspaceStatus } from '../models/project.js';
import type {
  AiGenerationStepPayload,
  AnalysisProgress,
  OAuthProvider,
  ReasoningEntryDto,
  SemanticProposalDto,
} from './dto/index.js';

// ---- Repository & auth ----

export interface RepositoryConnectedPayload {
  readonly projectId: WorkspaceId;
  readonly source: string;
  readonly path: string;
}

export interface AuthCompletedPayload {
  readonly provider: OAuthProvider;
  readonly success: boolean;
  readonly username?: string;
}

// ---- Framework detection ----

export interface FrameworkDetectedPayload {
  readonly projectId: WorkspaceId;
  readonly framework: Framework;
}

export interface FrameworkDetectionFailedPayload {
  readonly projectId: WorkspaceId;
  readonly reasons: readonly string[];
}

// ---- Repository analysis ----

export interface RepositoryAnalysisStartedPayload {
  readonly projectId: WorkspaceId;
  readonly jobId: string;
}

export interface RepositoryAnalysisProgressPayload {
  readonly projectId: WorkspaceId;
  readonly jobId: string;
  readonly progress: AnalysisProgress;
}

export interface RepositoryAnalysisCompletedPayload {
  readonly projectId: WorkspaceId;
  readonly jobId: string;
  readonly understandingScore: number;
}

export interface RepositoryFileChangedPayload {
  readonly projectId: WorkspaceId;
  readonly path: string;
  readonly changeType: 'created' | 'modified' | 'deleted';
}

export interface RepositoryIndexUpdatedPayload {
  readonly projectId: WorkspaceId;
  readonly version: number;
}

// ---- Project lifecycle ----

export interface ProjectReadyPayload {
  readonly projectId: WorkspaceId;
  readonly status: WorkspaceStatus;
}

// ---- AI generation (M4) ----

export interface AiGenerationStartedPayload {
  readonly projectId: WorkspaceId;
  readonly sessionId: string;
  readonly proposalId: string;
  readonly prompt: string;
}

export interface AiGenerationStepEventPayload extends AiGenerationStepPayload {
  readonly projectId: WorkspaceId;
}

export interface AiReasoningEntryPayload {
  readonly projectId: WorkspaceId;
  readonly sessionId: string;
  readonly entry: ReasoningEntryDto;
}

export interface AiGenerationCompletedPayload {
  readonly projectId: WorkspaceId;
  readonly sessionId: string;
  readonly proposal: SemanticProposalDto;
}

// ---- Semantic model ----

export interface SemanticProposalAppliedPayload {
  readonly projectId: WorkspaceId;
  readonly proposalId: string;
  readonly slug: string;
}

export interface SemanticProposalDiscardedPayload {
  readonly projectId: WorkspaceId;
  readonly proposalId: string;
}

export interface SemanticTestChangedPayload {
  readonly projectId: WorkspaceId;
  readonly slug: string;
}

export type {
  ExecutionStartedPayload,
  ExecutionStepEventPayload,
  ExecutionCompletedPayload,
  ExecutionClassifiedPayload,
} from './dto/execution.js';

export type {
  GitStatusChangedPayload,
  GitCommittedPayload,
  GitPushedPayload,
  GitPushFailedPayload,
} from './dto/git.js';
