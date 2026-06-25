import { join } from 'node:path';
import { openDatabase, IndexCacheRepository, ProjectRepository, RunRepository } from '@verity/local-persistence';
import { ServiceContainer } from './service-container.js';
import { DomainEventBus } from './event-bus.js';
import { RepositoryConnectorService } from './services/repository-connector-service.js';
import { IntelligenceService } from './services/intelligence-service.js';
import { SemanticModelService } from './services/semantic-model-service.js';
import { AdapterRegistryService } from './services/adapter-registry-service.js';
import { AiService } from './services/ai-service.js';
import { RepositoryWatcherService } from './services/repository-watcher-service.js';
import { ProjectService } from './services/project-service.js';
import { ExecutionService } from './services/execution-service.js';
import { GitService } from './services/git-service.js';
import { UpdateService } from './services/update-service.js';
import { WorkspaceEntryService } from './services/workspace-entry-service.js';
import { Tokens } from './tokens.js';

export interface ContainerOptions {
  /** Override SQLite path (used by backend E2E tests). */
  readonly dbPath?: string;
}

/**
 * Composition root (architecture §2.1). Wires every singleton into the
 * ServiceContainer. This is the ONLY place concrete implementations are
 * constructed; everything else depends on interfaces (clean architecture).
 */
export function buildContainer(options: ContainerOptions = {}): ServiceContainer {
  const container = new ServiceContainer();

  const dbPath =
    options.dbPath ??
    join(process.env.VERITY_USER_DATA ?? process.cwd(), 'verity.db');

  container
    .register(
      Tokens.Database,
      () => openDatabase(dbPath),
      (handle) => handle.close(),
    )
    .register(Tokens.EventBus, () => new DomainEventBus())
    .register(Tokens.ProjectService, (c) => {
      const { db } = c.resolve(Tokens.Database);
      const repo = new ProjectRepository(db);
      return new ProjectService(repo, c.resolve(Tokens.EventBus));
    })
    .register(Tokens.IndexCacheRepository, (c) => {
      const { db } = c.resolve(Tokens.Database);
      return new IndexCacheRepository(db);
    })
    .register(Tokens.RunRepository, (c) => {
      const { db } = c.resolve(Tokens.Database);
      return new RunRepository(db);
    })
    .register(Tokens.RepositoryConnector, (c) => {
      return new RepositoryConnectorService(
        c.resolve(Tokens.ProjectService),
        c.resolve(Tokens.EventBus),
      );
    })
    .register(Tokens.IntelligenceService, (c) => {
      return new IntelligenceService(
        c.resolve(Tokens.ProjectService),
        c.resolve(Tokens.IndexCacheRepository),
        c.resolve(Tokens.EventBus),
      );
    })
    .register(Tokens.AdapterRegistry, (c) => {
      return new AdapterRegistryService(
        c.resolve(Tokens.ProjectService),
        c.resolve(Tokens.IndexCacheRepository),
      );
    })
    .register(
      Tokens.RepositoryWatcher,
      (c) => {
        const watcher = new RepositoryWatcherService(
          c.resolve(Tokens.ProjectService),
          c.resolve(Tokens.IntelligenceService),
          c.resolve(Tokens.IndexCacheRepository),
          c.resolve(Tokens.EventBus),
        );
        watcher.start();
        return watcher;
      },
      (watcher) => watcher.stopAll(),
    )
    .register(Tokens.SemanticModelService, (c) => {
      return new SemanticModelService(
        c.resolve(Tokens.ProjectService),
        c.resolve(Tokens.EventBus),
        c.resolve(Tokens.AdapterRegistry),
        c.resolve(Tokens.RunRepository),
      );
    })
    .register(Tokens.AiService, (c) => {
      return new AiService(
        c.resolve(Tokens.ProjectService),
        c.resolve(Tokens.SemanticModelService),
        c.resolve(Tokens.IntelligenceService),
        c.resolve(Tokens.EventBus),
      );
    })
    .register(Tokens.ExecutionService, (c) => {
      return new ExecutionService(
        c.resolve(Tokens.ProjectService),
        c.resolve(Tokens.SemanticModelService),
        c.resolve(Tokens.AdapterRegistry),
        c.resolve(Tokens.RunRepository),
        c.resolve(Tokens.EventBus),
      );
    })
    .register(Tokens.GitService, (c) => {
      return new GitService(c.resolve(Tokens.ProjectService), c.resolve(Tokens.EventBus));
    })
    .register(Tokens.UpdateService, () => {
      const service = new UpdateService();
      service.init();
      return service;
    })
    .register(Tokens.WorkspaceEntry, (c) => {
      const demoAssets = join(__dirname, '../../assets/demo-shop-e2e');
      return new WorkspaceEntryService(
        c.resolve(Tokens.ProjectService),
        c.resolve(Tokens.RepositoryConnector),
        c.resolve(Tokens.IntelligenceService),
        demoAssets,
      );
    });

  return container;
}

/** Electron entry — resolves userData path before building the container. */
export async function buildElectronContainer(): Promise<ServiceContainer> {
  const { app } = await import('electron');
  return buildContainer({ dbPath: join(app.getPath('userData'), 'verity.db') });
}
