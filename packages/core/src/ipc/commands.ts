import type {
  CreateProjectInput,
  Project,
  ProjectSettings,
  WorkspaceId,
} from '../index.js';
import type {
  AiGenerateRequest,
  AiGenerateResponse,
  AnalysisJob,
  BusinessFlowDto,
  ConnectLocalRepositoryRequest,
  ConnectLocalRepositoryResponse,
  DetectFrameworkRequest,
  FileNode,
  Framework,
  GetAnalysisStatusRequest,
  IntelligenceSummaryDto,
  LocatorDto,
  OAuthStartRequest,
  OAuthStartResponse,
  OAuthStatusRequest,
  OAuthStatusResponse,
  PageDto,
  PickFolderResponse,
  ProjectScopedRequest,
  RepositoryIndexDto,
  SemanticApplyProposalRequest,
  SemanticDeleteRequest,
  SemanticDiscardProposalRequest,
  SemanticGetRequest,
  SemanticListRequest,
  SemanticPreviewCodeRequest,
  SemanticPreviewCodeResponse,
  SemanticProposalDto,
  SemanticTestDto,
  SemanticTestSummaryDto,
  SemanticWriteRequest,
  StartAnalysisRequest,
  StartAnalysisResponse,
} from './dto/index.js';

/**
 * CommandMap (resolution P-01) — the closed, typed catalog of request/response
 * IPC commands. The preload bridge exposes ONLY these channels; the renderer
 * cannot invoke anything outside this map.
 *
 * Channel namespaces:
 * - `app:*` / `project:*` / `settings:*` — EPIC 0 foundation
 * - `repository:*` — M1 repository connection
 * - `intelligence:*` — M1 repository intelligence
 * - `semantic:*` — M2 semantic model + M4 proposal apply
 * - `ai:*` — M4 AI Test Studio
 */
export interface CommandMap {
  // ---- App ----
  'app:ping': {
    request: void;
    response: { pong: true; version: string };
  };

  // ---- Project ----
  'project:create': {
    request: CreateProjectInput;
    response: Project;
  };
  /** Wizard Step 0 — name only; repository connected in Step 1. */
  'project:create-draft': {
    request: { name: string };
    response: Project;
  };
  'project:list': {
    request: void;
    response: Project[];
  };
  'project:get': {
    request: { projectId: WorkspaceId };
    response: Project;
  };
  'project:open': {
    request: { projectId: WorkspaceId };
    response: Project;
  };
  /** Wizard Step 4 — mark workspace READY after analysis completes (M1). */
  'project:finalize': {
    request: { projectId: WorkspaceId };
    response: Project;
  };

  // ---- Settings ----
  'settings:get': {
    request: { projectId: WorkspaceId };
    response: ProjectSettings;
  };
  'settings:update': {
    request: { projectId: WorkspaceId; settings: ProjectSettings };
    response: ProjectSettings;
  };

  // ---- Repository (M1) ----
  'repository:pick-folder': {
    request: void;
    response: PickFolderResponse;
  };
  'repository:connect-local': {
    request: ConnectLocalRepositoryRequest;
    response: ConnectLocalRepositoryResponse;
  };
  'repository:oauth-start': {
    request: OAuthStartRequest;
    response: OAuthStartResponse;
  };
  'repository:oauth-status': {
    request: OAuthStatusRequest;
    response: OAuthStatusResponse;
  };

  // ---- Intelligence (M1) ----
  'intelligence:detect-framework': {
    request: DetectFrameworkRequest;
    response: Framework;
  };
  'intelligence:start-analysis': {
    request: StartAnalysisRequest;
    response: StartAnalysisResponse;
  };
  'intelligence:get-analysis-status': {
    request: GetAnalysisStatusRequest;
    response: AnalysisJob;
  };
  'intelligence:get-index': {
    request: ProjectScopedRequest;
    response: RepositoryIndexDto;
  };
  'intelligence:get-file-tree': {
    request: ProjectScopedRequest;
    response: readonly FileNode[];
  };
  'intelligence:get-pages': {
    request: ProjectScopedRequest;
    response: readonly PageDto[];
  };
  'intelligence:get-flows': {
    request: ProjectScopedRequest;
    response: readonly BusinessFlowDto[];
  };
  'intelligence:get-locators': {
    request: ProjectScopedRequest;
    response: readonly LocatorDto[];
  };
  'intelligence:get-summary': {
    request: ProjectScopedRequest;
    response: IntelligenceSummaryDto;
  };

  // ---- Semantic model (M2 / M4) ----
  'semantic:list': {
    request: SemanticListRequest;
    response: readonly SemanticTestSummaryDto[];
  };
  'semantic:get': {
    request: SemanticGetRequest;
    response: SemanticTestDto;
  };
  'semantic:write': {
    request: SemanticWriteRequest;
    response: SemanticTestDto;
  };
  'semantic:delete': {
    request: SemanticDeleteRequest;
    response: void;
  };
  'semantic:preview-code': {
    request: SemanticPreviewCodeRequest;
    response: SemanticPreviewCodeResponse;
  };
  'semantic:apply-proposal': {
    request: SemanticApplyProposalRequest;
    response: SemanticProposalDto;
  };
  'semantic:discard-proposal': {
    request: SemanticDiscardProposalRequest;
    response: void;
  };

  // ---- AI orchestration (M4) ----
  'ai:generate': {
    request: AiGenerateRequest;
    response: AiGenerateResponse;
  };
}

export type CommandChannel = keyof CommandMap;
export type CommandRequest<C extends CommandChannel> = CommandMap[C]['request'];
export type CommandResponse<C extends CommandChannel> = CommandMap[C]['response'];

export const COMMAND_CHANNELS = [
  'app:ping',
  'project:create',
  'project:create-draft',
  'project:list',
  'project:get',
  'project:open',
  'project:finalize',
  'settings:get',
  'settings:update',
  'repository:pick-folder',
  'repository:connect-local',
  'repository:oauth-start',
  'repository:oauth-status',
  'intelligence:detect-framework',
  'intelligence:start-analysis',
  'intelligence:get-analysis-status',
  'intelligence:get-index',
  'intelligence:get-file-tree',
  'intelligence:get-pages',
  'intelligence:get-flows',
  'intelligence:get-locators',
  'intelligence:get-summary',
  'semantic:list',
  'semantic:get',
  'semantic:write',
  'semantic:delete',
  'semantic:preview-code',
  'semantic:apply-proposal',
  'semantic:discard-proposal',
  'ai:generate',
] as const satisfies readonly CommandChannel[];
