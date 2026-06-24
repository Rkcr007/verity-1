import { app } from 'electron';
import type { ServiceContainer } from './service-container.js';
import type { IPCRouter } from './ipc-router.js';
import { Tokens } from './tokens.js';

/**
 * Binds every CommandMap channel to a service method (architecture §2.1).
 */
export function registerHandlers(router: IPCRouter, container: ServiceContainer): void {
  router.handle('app:ping', () => ({ pong: true as const, version: app.getVersion() }));

  const projects = () => container.resolve(Tokens.ProjectService);
  const repo = () => container.resolve(Tokens.RepositoryConnector);
  const intel = () => container.resolve(Tokens.IntelligenceService);
  const semantic = () => container.resolve(Tokens.SemanticModelService);
  const ai = () => container.resolve(Tokens.AiService);

  router.handle('project:create', (request) => projects().create(request));
  router.handle('project:create-draft', (request) => projects().createDraft(request.name));
  router.handle('project:list', () => projects().list());
  router.handle('project:get', (request) => projects().get(request.projectId));
  router.handle('project:open', (request) => projects().open(request.projectId));
  router.handle('project:finalize', (request) => projects().finalize(request.projectId));

  router.handle('settings:get', (request) => projects().getSettings(request.projectId));
  router.handle('settings:update', (request) =>
    projects().updateSettings(request.projectId, request.settings),
  );

  router.handle('repository:pick-folder', () => repo().pickFolder());
  router.handle('repository:connect-local', (request) => {
    const project = repo().connectLocal(request.projectId, request.localPath);
    return { project, repository: project.repository };
  });
  router.handle('repository:oauth-start', (request) => repo().startOAuth(request.provider));
  router.handle('repository:oauth-status', (request) => repo().getOAuthStatus(request.provider));

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

  router.handle('ai:generate', (request) => ai().generate(request));
}
