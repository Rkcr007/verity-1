import { app } from 'electron';
import type { ServiceContainer } from './service-container.js';
import type { IPCRouter } from './ipc-router.js';
import { Tokens } from './tokens.js';

/**
 * Binds every CommandMap channel to a service method (architecture §2.1).
 *
 * Each handler is thin: validate-free pass-through to a service, which returns
 * domain data. The IPCRouter wraps the return value in a Result and serializes
 * any thrown VerityError. New epics add their channels here.
 */
export function registerHandlers(router: IPCRouter, container: ServiceContainer): void {
  router.handle('app:ping', () => ({ pong: true as const, version: app.getVersion() }));

  router.handle('project:create', (request) =>
    container.resolve(Tokens.ProjectService).create(request),
  );

  router.handle('project:list', () => container.resolve(Tokens.ProjectService).list());

  router.handle('project:get', (request) =>
    container.resolve(Tokens.ProjectService).get(request.projectId),
  );

  router.handle('project:open', (request) =>
    container.resolve(Tokens.ProjectService).open(request.projectId),
  );

  router.handle('settings:get', (request) =>
    container.resolve(Tokens.ProjectService).getSettings(request.projectId),
  );

  router.handle('settings:update', (request) =>
    container.resolve(Tokens.ProjectService).updateSettings(request.projectId, request.settings),
  );
}
