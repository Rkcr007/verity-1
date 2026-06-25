import type { WorkspaceId } from '../../ids.js';
import type { ProposalId } from '../../ids.js';
import type { SemanticStepDto } from './semantic.js';

/** Reasoning trace entry streamed to the AI Studio bottom panel. */
export type ReasoningEntryType = 'ai' | 'step' | 'ok' | 'err';

export interface ReasoningEntryDto {
  readonly type: ReasoningEntryType;
  readonly message: string;
  readonly timestamp: number;
}

export interface AiGenerateRequest {
  readonly projectId: WorkspaceId;
  readonly prompt: string;
  /** Optional follow-up referencing a prior proposal. */
  readonly proposalId?: ProposalId;
}

export interface AiGenerateResponse {
  readonly sessionId: string;
  readonly proposalId: ProposalId;
}

export type AiGenerationMode = 'llm' | 'rules';

export interface AiCapabilitiesResponse {
  readonly llmAvailable: boolean;
  readonly mode: AiGenerationMode;
}

/** Partial step streamed during generation before the proposal is complete. */
export interface AiGenerationStepPayload {
  readonly sessionId: string;
  readonly proposalId: ProposalId;
  readonly step: Partial<SemanticStepDto> & { readonly id?: number };
  readonly index: number;
}
