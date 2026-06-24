import type { VerityDatabase, IIndexCacheRepository } from '@verity/local-persistence';
import type { DomainEventBus } from './event-bus.js';
import type { IAiService } from './services/ai-service.js';
import type { IIntelligenceService } from './services/intelligence-service.js';
import type { IRepositoryConnectorService } from './services/repository-connector-service.js';
import type { IProjectService } from './services/project-service.js';
import type { IRepositoryWatcherService } from './services/repository-watcher-service.js';
import type { ISemanticModelService } from './services/semantic-model-service.js';
import { createToken } from './service-container.js';

/**
 * Service tokens — the typed keys the ServiceContainer resolves against (I-01).
 */
export const Tokens = {
  Database: createToken<{ db: VerityDatabase; close: () => void }>('Database'),
  EventBus: createToken<DomainEventBus>('EventBus'),
  ProjectService: createToken<IProjectService>('ProjectService'),
  IndexCacheRepository: createToken<IIndexCacheRepository>('IndexCacheRepository'),
  RepositoryConnector: createToken<IRepositoryConnectorService>('RepositoryConnector'),
  IntelligenceService: createToken<IIntelligenceService>('IntelligenceService'),
  RepositoryWatcher: createToken<IRepositoryWatcherService>('RepositoryWatcher'),
  SemanticModelService: createToken<ISemanticModelService>('SemanticModelService'),
  AiService: createToken<IAiService>('AiService'),
} as const;
