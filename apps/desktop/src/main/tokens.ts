import type { VerityDatabase, IIndexCacheRepository, IRunRepository } from '@verity/local-persistence';
import type { DomainEventBus } from './event-bus.js';
import type { IAdapterRegistryService } from './services/adapter-registry-service.js';
import type { IAiService } from './services/ai-service.js';
import type { IIntelligenceService } from './services/intelligence-service.js';
import type { IRepositoryConnectorService } from './services/repository-connector-service.js';
import type { IProjectService } from './services/project-service.js';
import type { IRepositoryWatcherService } from './services/repository-watcher-service.js';
import type { ISemanticModelService } from './services/semantic-model-service.js';
import type { IExecutionService } from './services/execution-service.js';
import type { IWorkspaceEntryService } from './services/workspace-entry-service.js';
import { createToken } from './service-container.js';

/**
 * Service tokens — the typed keys the ServiceContainer resolves against (I-01).
 */
export const Tokens = {
  Database: createToken<{ db: VerityDatabase; close: () => void }>('Database'),
  EventBus: createToken<DomainEventBus>('EventBus'),
  ProjectService: createToken<IProjectService>('ProjectService'),
  IndexCacheRepository: createToken<IIndexCacheRepository>('IndexCacheRepository'),
  RunRepository: createToken<IRunRepository>('RunRepository'),
  RepositoryConnector: createToken<IRepositoryConnectorService>('RepositoryConnector'),
  IntelligenceService: createToken<IIntelligenceService>('IntelligenceService'),
  AdapterRegistry: createToken<IAdapterRegistryService>('AdapterRegistry'),
  RepositoryWatcher: createToken<IRepositoryWatcherService>('RepositoryWatcher'),
  SemanticModelService: createToken<ISemanticModelService>('SemanticModelService'),
  AiService: createToken<IAiService>('AiService'),
  ExecutionService: createToken<IExecutionService>('ExecutionService'),
  WorkspaceEntry: createToken<IWorkspaceEntryService>('WorkspaceEntry'),
} as const;
