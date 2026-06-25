import { app } from 'electron';
import type { PrerequisiteReport } from '@verity/adapter-contract';
import type { PrerequisiteReportDto } from '@verity/core/ipc';
import type { ServiceContainer } from './service-container.js';
import type { IPCRouter } from './ipc-router.js';
import { Tokens } from './tokens.js';

/**
 * Binds every CommandMap channel to a service method (architecture §2.1).
 */
export function registerHandlers(router: IPCRouter, container: ServiceContainer): void {
  const projects = () => container.resolve(Tokens.ProjectService);
  const repo = () => container.resolve(Tokens.RepositoryConnector);
  const intel = () => container.resolve(Tokens.IntelligenceService);
  const semantic = () => container.resolve(Tokens.SemanticModelService);
  const ai = () => container.resolve(Tokens.AiService);
  const execution = () => container.resolve(Tokens.ExecutionService);
  const git = () => container.resolve(Tokens.GitService);
  const updates = () => container.resolve(Tokens.UpdateService);
  const entry = () => container.resolve(Tokens.WorkspaceEntry);

  router.handle('app:ping', () => {
    projects().list();
    return { pong: true as const, version: app.getVersion() };
  });

  router.handle('app:get-update-status', () => updates().getStatus());
  router.handle('app:check-for-updates', () => updates().checkForUpdates());
  router.handle('app:download-update', () => updates().downloadUpdate());
  router.handle('app:install-update', () => {
    updates().installUpdate();
  });

  router.handle('project:create', (request) => projects().create(request));
  router.handle('project:create-draft', (request) => projects().createDraft(request.name));
  router.handle('project:list', () => projects().list());
  router.handle('project:get', (request) => projects().get(request.projectId));
  router.handle('project:open', (request) => projects().open(request.projectId));
  router.handle('project:finalize', (request) => projects().finalize(request.projectId));
  router.handle('project:get-recent', () => ({ project: entry().getRecent() }));
  router.handle('project:open-demo', () => entry().openDemo());
  router.handle('project:scaffold-greenfield', (request) => {
    const result = entry().scaffoldGreenfield(
      request.projectId,
      request.localPath,
      request.adapterId,
      request.appDescription,
    );
    return { project: result.project, filesCreated: result.filesCreated, setup: result.setup };
  });
  router.handle('project:setup-environment', (request) => ({
    setup: entry().setupEnvironment(request.projectId),
  }));

  router.handle('settings:get', (request) => projects().getSettings(request.projectId));
  router.handle('settings:update', (request) =>
    projects().updateSettings(request.projectId, request.settings),
  );

  router.handle('repository:pick-folder', () => repo().pickFolder());
  router.handle('repository:pick-parent-folder', () => repo().pickParentFolder());
  router.handle('repository:create-folder', (request) =>
    repo().createProjectFolder(request.parentPath, request.folderName),
  );
  router.handle('repository:connect-local', (request) => {
    const project = repo().connectLocal(request.projectId, request.localPath);
    return { project, repository: project.repository };
  });
  router.handle('repository:oauth-start', (request) => repo().startOAuth(request.provider));
  router.handle('repository:oauth-status', (request) => repo().getOAuthStatus(request.provider));
  router.handle('repository:inspect-folder', (request) => entry().inspectFolder(request.path));
  router.handle('repository:read-file', (request) =>
    intel().readRepositoryFile(request.projectId, request.relativePath),
  );

  router.handle('intelligence:detect-framework', (request) =>
    intel().detectFramework(request.projectId),
  );
  router.handle('intelligence:start-analysis', (request) => ({
    jobId: intel().startAnalysis(request.projectId),
  }));
  router.handle('intelligence:get-analysis-status', (request) =>
    intel().getAnalysisStatus(request.projectId, request.jobId),
  );
  router.handle('intelligence:get-index', (request) => intel().getIndex(request.projectId));
  router.handle('intelligence:get-file-tree', (request) => intel().getFileTree(request.projectId));
  router.handle('intelligence:get-pages', (request) => intel().getIndex(request.projectId).pages);
  router.handle('intelligence:get-flows', (request) => intel().getIndex(request.projectId).flows);
  router.handle('intelligence:get-locators', (request) =>
    intel().getIndex(request.projectId).locators,
  );
  router.handle('intelligence:get-summary', (request) => intel().getSummary(request.projectId));
  router.handle('intelligence:recommend-entry', (request) => entry().recommendEntry(request.path));
  router.handle('intelligence:get-framework-catalog', () => ({
    entries: entry().getFrameworkCatalog(),
  }));
  router.handle('intelligence:recommend-framework', async (request) =>
    entry().recommendFramework(request),
  );
  router.handle('toolchain:install-for-adapter', (request) => ({
    setup: entry().installToolchain(request.adapterId),
  }));
  router.handle('intelligence:get-migration-plan', (request) =>
    entry().getMigrationPlan(request.projectId),
  );

  router.handle('semantic:list', (request) => semantic().list(request.projectId));
  router.handle('semantic:get', (request) => semantic().get(request.projectId, request.slug));
  router.handle('semantic:write', (request) => semantic().write(request.projectId, request.test));
  router.handle('semantic:delete', (request) => {
    semantic().delete(request.projectId, request.slug);
  });
  router.handle('semantic:preview-code', (request) =>
    semantic().previewCode(request.projectId, request.test),
  );
  router.handle('semantic:apply-proposal', (request) => semantic().applyProposal(request));
  router.handle('semantic:discard-proposal', (request) => {
    semantic().discardProposal(request);
  });
  router.handle('semantic:get-proposal', (request) =>
    semantic().getProposal(request.projectId, request.proposalId),
  );

  router.handle('ai:generate', (request) => ai().generate(request));
  router.handle('ai:get-capabilities', () => ai().getCapabilities());

  router.handle('execution:run', (request) => ({
    runId: execution().run(request),
  }));
  router.handle('execution:cancel', (request) => {
    execution().cancel(request);
  });
  router.handle('execution:get', (request) => execution().get(request));
  router.handle('execution:list', (request) => execution().list(request));

  router.handle('git:get-status', (request) => git().getStatus(request));
  router.handle('git:get-diff', (request) => git().getDiff(request));
  router.handle('git:commit', (request) => git().commit(request));
  router.handle('git:push', (request) => git().push(request));
  router.handle('git:list-branches', (request) => git().listBranches(request));
  router.handle('git:checkout-branch', (request) => git().checkoutBranch(request));

  const adapters = () => container.resolve(Tokens.AdapterRegistry);

  router.handle('adapter:list', () => adapters().list());
  router.handle('adapter:check-prerequisites', (request) =>
    toPrerequisiteReportDto(adapters().checkPrerequisites(request.projectId)),
  );
}

function toPrerequisiteReportDto(report: PrerequisiteReport): PrerequisiteReportDto {
  return {
    ready: report.ready,
    checks: report.checks.map((check) => ({
      name: check.name,
      satisfied: check.satisfied,
      message: check.message,
      ...(check.guidance !== undefined ? { guidance: check.guidance } : {}),
    })),
  };
}
