export type {
  OAuthProvider,
  ConnectLocalRepositoryRequest,
  ConnectLocalRepositoryResponse,
  PickFolderResponse,
  CreateProjectFolderRequest,
  CreateProjectFolderResponse,
  OAuthStartRequest,
  OAuthStartResponse,
  OAuthStatusRequest,
  OAuthStatusResponse,
  ReadRepositoryFileRequest,
  ReadRepositoryFileResponse,
  RepositorySource,
} from './repository.js';

export type {
  AnalysisJobStatus,
  AnalysisJob,
  AnalysisProgress,
  FileNode,
  PageDto,
  BusinessFlowDto,
  LocatorDto,
  ConventionDto,
  RepositoryIndexDto,
  IntelligenceSummaryDto,
  DetectFrameworkRequest,
  StartAnalysisRequest,
  StartAnalysisResponse,
  GetAnalysisStatusRequest,
  ProjectScopedRequest,
  Framework,
} from './intelligence.js';

export type {
  LocatorStrategyDto,
  StepLocatorRefDto,
  SemanticStepDto,
  SemanticTestDto,
  SemanticTestRunStatus,
  SemanticTestSummaryDto,
  SemanticListRequest,
  SemanticGetRequest,
  SemanticWriteRequest,
  SemanticDeleteRequest,
  SemanticPreviewCodeRequest,
  ProjectedCodeFileDto,
  SemanticPreviewCodeResponse,
  ProposedFileChangeDto,
  SemanticProposalDto,
  SemanticApplyProposalRequest,
  SemanticDiscardProposalRequest,
  SemanticGetProposalRequest,
} from './semantic.js';

export type {
  ReasoningEntryType,
  ReasoningEntryDto,
  AiGenerateRequest,
  AiGenerateResponse,
  AiGenerationStepPayload,
} from './ai.js';

export type {
  AdapterInfoDto,
  PrerequisiteCheckDto,
  PrerequisiteReportDto,
  AdapterListRequest,
  AdapterCheckPrerequisitesRequest,
} from './adapter.js';

export type {
  ExecutionStepEventType,
  ExecutionStepEventPayload,
  ExecutionStartedPayload,
  ExecutionOutcome,
  ExecutionCompletedPayload,
  FailureClassificationType,
  ExecutionClassifiedPayload,
  RunStepStatus,
  RunStepDto,
  ExecutionRunDto,
  ExecutionRunRequest,
  ExecutionRunResponse,
  ExecutionCancelRequest,
  ExecutionGetRequest,
  ExecutionListRequest,
} from './execution.js';

export type {
  GitChangeType,
  GitStatusChangedPayload,
  GitCommittedPayload,
  GitPushedPayload,
  GitPushFailedPayload,
} from './git.js';

export type {
  WizardEntryMode,
  FolderEntryKind,
  FolderInspectionDto,
  InspectFolderRequest,
  EntryRecommendationDto,
  RecommendEntryRequest,
  ScaffoldGreenfieldRequest,
  ScaffoldGreenfieldResponse,
  GetRecentProjectResponse,
  MigrationStepDto,
  MigrationPlanDto,
  GetMigrationPlanRequest,
} from './entry.js';

export type {
  FrameworkMaturity,
  EnterpriseTier,
  FrameworkCatalogEntryDto,
  GetFrameworkCatalogResponse,
  RecommendFrameworkMode,
  RecommendFrameworkRequest,
  FrameworkRecommendationDto,
  EnvironmentSetupStepStatus,
  EnvironmentSetupStepDto,
  EnvironmentSetupResultDto,
  SetupEnvironmentRequest,
  SetupEnvironmentResponse,
  InstallToolchainRequest,
  InstallToolchainResponse,
} from './framework-intelligence.js';
