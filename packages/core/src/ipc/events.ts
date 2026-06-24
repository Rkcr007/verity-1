import type { WorkspaceId } from '../ids.js';
import type {
  ProjectCreatedPayload,
  WorkspaceStatusChangedPayload,
} from '../events.js';
import type {
  AiGenerationCompletedPayload,
  AiGenerationStartedPayload,
  AiGenerationStepEventPayload,
  AiReasoningEntryPayload,
  AuthCompletedPayload,
  ExecutionClassifiedPayload,
  ExecutionCompletedPayload,
  ExecutionStartedPayload,
  ExecutionStepEventPayload,
  FrameworkDetectedPayload,
  FrameworkDetectionFailedPayload,
  GitCommittedPayload,
  GitPushFailedPayload,
  GitPushedPayload,
  GitStatusChangedPayload,
  ProjectReadyPayload,
  RepositoryAnalysisCompletedPayload,
  RepositoryAnalysisProgressPayload,
  RepositoryAnalysisStartedPayload,
  RepositoryConnectedPayload,
  RepositoryFileChangedPayload,
  RepositoryIndexUpdatedPayload,
  SemanticProposalAppliedPayload,
  SemanticProposalDiscardedPayload,
  SemanticTestChangedPayload,
} from './event-payloads.js';

/**
 * EventMap (resolution P-01 / E-01) — closed catalog of main→renderer pushed
 * events (architecture §6.2). Channels are forwarded by IPCForwarder when
 * registered in EVENT_CHANNELS.
 */
export interface EventMap {
  // EPIC 0
  'workspace.status.changed': WorkspaceStatusChangedPayload;
  'project.created': ProjectCreatedPayload;
  'project.opened': { projectId: WorkspaceId };
  'project.ready': ProjectReadyPayload;

  // M1 — repository & intelligence
  'repository.connected': RepositoryConnectedPayload;
  'auth.completed': AuthCompletedPayload;
  'framework.detected': FrameworkDetectedPayload;
  'framework.detection.failed': FrameworkDetectionFailedPayload;
  'repository.analysis.started': RepositoryAnalysisStartedPayload;
  'repository.analysis.progress': RepositoryAnalysisProgressPayload;
  'repository.analysis.completed': RepositoryAnalysisCompletedPayload;
  'repository.file.changed': RepositoryFileChangedPayload;
  'repository.index.updated': RepositoryIndexUpdatedPayload;

  // M2 / M4 — semantic model
  'semantic.test.created': SemanticTestChangedPayload;
  'semantic.test.updated': SemanticTestChangedPayload;
  'semantic.proposal.applied': SemanticProposalAppliedPayload;
  'semantic.proposal.discarded': SemanticProposalDiscardedPayload;

  // M4 — AI studio
  'ai.generation.started': AiGenerationStartedPayload;
  'ai.generation.step': AiGenerationStepEventPayload;
  'ai.reasoning.entry': AiReasoningEntryPayload;
  'ai.generation.completed': AiGenerationCompletedPayload;

  // M5 — execution
  'execution.started': ExecutionStartedPayload;
  'execution.step.event': ExecutionStepEventPayload;
  'execution.completed': ExecutionCompletedPayload;
  'execution.classified': ExecutionClassifiedPayload;

  // M6 — git
  'git.status.changed': GitStatusChangedPayload;
  'git.committed': GitCommittedPayload;
  'git.pushed': GitPushedPayload;
  'git.push.failed': GitPushFailedPayload;
}

export type EventChannel = keyof EventMap;
export type EventPayload<E extends EventChannel> = EventMap[E];

export const EVENT_CHANNELS = [
  'workspace.status.changed',
  'project.created',
  'project.opened',
  'project.ready',
  'repository.connected',
  'auth.completed',
  'framework.detected',
  'framework.detection.failed',
  'repository.analysis.started',
  'repository.analysis.progress',
  'repository.analysis.completed',
  'repository.file.changed',
  'repository.index.updated',
  'semantic.test.created',
  'semantic.test.updated',
  'semantic.proposal.applied',
  'semantic.proposal.discarded',
  'ai.generation.started',
  'ai.generation.step',
  'ai.reasoning.entry',
  'ai.generation.completed',
  'execution.started',
  'execution.step.event',
  'execution.completed',
  'execution.classified',
  'git.status.changed',
  'git.committed',
  'git.pushed',
  'git.push.failed',
] as const satisfies readonly EventChannel[];
