import { app } from 'electron';
import { join } from 'node:path';
import { openDatabase, ProjectRepository } from '@verity/local-persistence';
import { ServiceContainer } from './service-container.js';
import { DomainEventBus } from './event-bus.js';
import { ProjectService } from './services/project-service.js';
import { Tokens } from './tokens.js';

/**
 * Composition root (architecture §2.1). Wires every singleton into the
 * ServiceContainer. This is the ONLY place concrete implementations are
 * constructed; everything else depends on interfaces (clean architecture).
 */
export function buildContainer(): ServiceContainer {
  const container = new ServiceContainer();

  const dbPath = join(app.getPath('userData'), 'verity.db');

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
    });

  return container;
}
