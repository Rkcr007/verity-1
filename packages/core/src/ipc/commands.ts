import type {
  CreateProjectInput,
  Project,
  ProjectSettings,
  WorkspaceId,
} from '../index.js';
import type {
  AdapterCheckPrerequisitesRequest,
  AdapterInfoDto,
  AiGenerateRequest,
  AiGenerateResponse,
  AiCapabilitiesResponse,
  AnalysisJob,
  BusinessFlowDto,
  ConnectLocalRepositoryRequest,
  ConnectLocalRepositoryResponse,
  CreateProjectFolderRequest,
  CreateProjectFolderResponse,
  DetectFrameworkRequest,
  EntryRecommendationDto,
  ExecutionCancelRequest,
  ExecutionGetRequest,
  ExecutionListRequest,
  ExecutionRunDto,
  ExecutionRunRequest,
  ExecutionRunResponse,
  FileNode,
  FolderInspectionDto,
  Framework,
  FrameworkRecommendationDto,
  GetAnalysisStatusRequest,
  GetFrameworkCatalogResponse,
  GetMigrationPlanRequest,
  InstallToolchainRequest,
  InstallToolchainResponse,
  GetRecentProjectResponse,
  InspectFolderRequest,
  IntelligenceSummaryDto,
  LocatorDto,
  MigrationPlanDto,
  OAuthStartRequest,
  OAuthStartResponse,
  OAuthStatusRequest,
  OAuthStatusResponse,
  PageDto,
  PickFolderResponse,
  PrerequisiteReportDto,
  ProjectScopedRequest,
  ReadRepositoryFileRequest,
  ReadRepositoryFileResponse,
  RecommendEntryRequest,
  RecommendFrameworkRequest,
  RepositoryIndexDto,
  ScaffoldGreenfieldRequest,
  ScaffoldGreenfieldResponse,
  SetupEnvironmentRequest,
  SetupEnvironmentResponse,
  SemanticApplyProposalRequest,
  SemanticDeleteRequest,
  SemanticDiscardProposalRequest,
  SemanticGetProposalRequest,
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
  GitStatusDto,
  GitGetDiffRequest,
  GitGetDiffResponse,
  GitCommitRequest,
  GitCommitResponse,
  GitPushRequest,
  GitPushResponse,
  GitListBranchesResponse,
  GitCheckoutBranchRequest,
  AppUpdateStatusDto,
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
 * - `git:*` — M6 Git Integration
 */
export interface CommandMap {
  // ---- App ----
  'app:ping': {
    request: void;
    response: { pong: true; version: string };
  };
  'app:get-update-status': {
    request: void;
    response: AppUpdateStatusDto;
  };
  'app:check-for-updates': {
    request: void;
    response: AppUpdateStatusDto;
  };
  'app:download-update': {
    request: void;
    response: AppUpdateStatusDto;
  };
  'app:install-update': {
    request: void;
    response: void;
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
  /** Most recently active READY project (M1.5 resume). */
  'project:get-recent': {
    request: void;
    response: GetRecentProjectResponse;
  };
  /** Bundled demo workspace — no company repo required (M1.5). */
  'project:open-demo': {
    request: void;
    response: Project;
  };
  /** Scaffold Playwright Java in an empty folder (M1.5 greenfield). */
  'project:scaffold-greenfield': {
    request: ScaffoldGreenfieldRequest;
    response: ScaffoldGreenfieldResponse;
  };
  /** Resolve Maven deps and install Playwright browsers after scaffold (M1.6). */
  'project:setup-environment': {
    request: SetupEnvironmentRequest;
    response: SetupEnvironmentResponse;
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
  /** Choose parent location before creating a new project folder (M1.7). */
  'repository:pick-parent-folder': {
    request: void;
    response: PickFolderResponse;
  };
  /** Create an empty project folder under a parent path (M1.7). */
  'repository:create-folder': {
    request: CreateProjectFolderRequest;
    response: CreateProjectFolderResponse;
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
  /** Inspect folder for empty / selenium / playwright signals (M1.5). */
  'repository:inspect-folder': {
    request: InspectFolderRequest;
    response: FolderInspectionDto;
  };
  /** Read a repository file for in-workspace preview (M2 editor surface). */
  'repository:read-file': {
    request: ReadRepositoryFileRequest;
    response: ReadRepositoryFileResponse;
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
  /** Rule-based Welcome / wizard routing recommendation (M1.5). */
  'intelligence:recommend-entry': {
    request: RecommendEntryRequest;
    response: EntryRecommendationDto;
  };
  /** Enterprise framework catalog for greenfield picker (M1.6). */
  'intelligence:get-framework-catalog': {
    request: void;
    response: GetFrameworkCatalogResponse;
  };
  /** Rule-based stack recommendation from mode + app description (M1.6). */
  'intelligence:recommend-framework': {
    request: RecommendFrameworkRequest;
    response: FrameworkRecommendationDto;
  };
  /** One-click JDK/Maven or Node install for adapter prerequisites (M7). */
  'toolchain:install-for-adapter': {
    request: InstallToolchainRequest;
    response: InstallToolchainResponse;
  };
  /** Selenium → Playwright Java migration plan (M1.5, rule-based). */
  'intelligence:get-migration-plan': {
    request: GetMigrationPlanRequest;
    response: MigrationPlanDto;
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
  'semantic:get-proposal': {
    request: SemanticGetProposalRequest;
    response: SemanticProposalDto;
  };

  // ---- AI orchestration (M4) ----
  'ai:generate': {
    request: AiGenerateRequest;
    response: AiGenerateResponse;
  };
  'ai:get-capabilities': {
    request: void;
    response: AiCapabilitiesResponse;
  };

  // ---- Execution (M5) ----
  'execution:run': {
    request: ExecutionRunRequest;
    response: ExecutionRunResponse;
  };
  'execution:cancel': {
    request: ExecutionCancelRequest;
    response: void;
  };
  'execution:get': {
    request: ExecutionGetRequest;
    response: ExecutionRunDto;
  };
  'execution:list': {
    request: ExecutionListRequest;
    response: readonly ExecutionRunDto[];
  };

  // ---- Adapter registry (M3) ----
  'adapter:list': {
    request: void;
    response: readonly AdapterInfoDto[];
  };
  'adapter:check-prerequisites': {
    request: AdapterCheckPrerequisitesRequest;
    response: PrerequisiteReportDto;
  };

  // ---- Git integration (M6) ----
  'git:get-status': {
    request: ProjectScopedRequest;
    response: GitStatusDto;
  };
  'git:get-diff': {
    request: GitGetDiffRequest;
    response: GitGetDiffResponse;
  };
  'git:commit': {
    request: GitCommitRequest;
    response: GitCommitResponse;
  };
  'git:push': {
    request: GitPushRequest;
    response: GitPushResponse;
  };
  'git:list-branches': {
    request: ProjectScopedRequest;
    response: GitListBranchesResponse;
  };
  'git:checkout-branch': {
    request: GitCheckoutBranchRequest;
    response: GitStatusDto;
  };
}

export type CommandChannel = keyof CommandMap;
export type CommandRequest<C extends CommandChannel> = CommandMap[C]['request'];
export type CommandResponse<C extends CommandChannel> = CommandMap[C]['response'];

export const COMMAND_CHANNELS = [
  'app:ping',
  'app:get-update-status',
  'app:check-for-updates',
  'app:download-update',
  'app:install-update',
  'project:create',
  'project:create-draft',
  'project:list',
  'project:get',
  'project:open',
  'project:finalize',
  'project:get-recent',
  'project:open-demo',
  'project:scaffold-greenfield',
  'project:setup-environment',
  'settings:get',
  'settings:update',
  'repository:pick-folder',
  'repository:pick-parent-folder',
  'repository:create-folder',
  'repository:connect-local',
  'repository:oauth-start',
  'repository:oauth-status',
  'repository:inspect-folder',
  'repository:read-file',
  'intelligence:detect-framework',
  'intelligence:start-analysis',
  'intelligence:get-analysis-status',
  'intelligence:get-index',
  'intelligence:get-file-tree',
  'intelligence:get-pages',
  'intelligence:get-flows',
  'intelligence:get-locators',
  'intelligence:get-summary',
  'intelligence:recommend-entry',
  'intelligence:get-framework-catalog',
  'intelligence:recommend-framework',
  'toolchain:install-for-adapter',
  'intelligence:get-migration-plan',
  'semantic:list',
  'semantic:get',
  'semantic:write',
  'semantic:delete',
  'semantic:preview-code',
  'semantic:apply-proposal',
  'semantic:discard-proposal',
  'semantic:get-proposal',
  'ai:generate',
  'ai:get-capabilities',
  'execution:run',
  'execution:cancel',
  'execution:get',
  'execution:list',
  'adapter:list',
  'adapter:check-prerequisites',
  'git:get-status',
  'git:get-diff',
  'git:commit',
  'git:push',
  'git:list-branches',
  'git:checkout-branch',
] as const satisfies readonly CommandChannel[];
