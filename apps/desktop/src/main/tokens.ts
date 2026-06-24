import type { VerityDatabase } from '@verity/local-persistence';
import type { DomainEventBus } from './event-bus.js';
import type { IProjectService } from './services/project-service.js';
import { createToken } from './service-container.js';

/**
 * Service tokens — the typed keys the ServiceContainer resolves against (I-01).
 * Declaring them in one place keeps the composition root readable and avoids
 * circular imports between services and the container.
 */
export const Tokens = {
  Database: createToken<{ db: VerityDatabase; close: () => void }>('Database'),
  EventBus: createToken<DomainEventBus>('EventBus'),
  ProjectService: createToken<IProjectService>('ProjectService'),
} as const;
