import { eq } from 'drizzle-orm';
import type {
  Framework,
  Project,
  ProjectSettings,
  ProjectStats,
  Repository,
  WorkspaceId,
  WorkspaceStatus,
} from '@verity/core';
import { PersistenceError } from '@verity/core';
import type { VerityDatabase } from '../database.js';
import { projects } from '../schema.js';

/**
 * ProjectRepository (resolution I-05) — the only persistence contract EPIC 0
 * implements concretely. It maps the `projects` row (JSON-encoded value objects)
 * to/from the domain `Project` aggregate (resolution X-01).
 */
export interface IProjectRepository {
  insert(project: Project): void;
  update(project: Project): void;
  findById(id: WorkspaceId): Project | null;
  list(): Project[];
  delete(id: WorkspaceId): void;
}

type ProjectRow = typeof projects.$inferSelect;

function toDomain(row: ProjectRow): Project {
  return {
    id: row.id as WorkspaceId,
    name: row.name,
    status: row.status as WorkspaceStatus,
    repository: row.repository as Repository,
    framework: row.framework as Framework,
    stats: row.stats as ProjectStats,
    settings: row.settings as ProjectSettings,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
  };
}

function toRow(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    repository: project.repository,
    framework: project.framework,
    stats: project.stats,
    settings: project.settings,
    createdAt: project.createdAt,
    lastActiveAt: project.lastActiveAt,
  };
}

export class ProjectRepository implements IProjectRepository {
  constructor(private readonly db: VerityDatabase) {}

  insert(project: Project): void {
    try {
      this.db.insert(projects).values(toRow(project)).run();
    } catch (error) {
      throw new PersistenceError(
        'Could not save the project.',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  update(project: Project): void {
    this.db.update(projects).set(toRow(project)).where(eq(projects.id, project.id)).run();
  }

  findById(id: WorkspaceId): Project | null {
    const row = this.db.select().from(projects).where(eq(projects.id, id)).get();
    return row ? toDomain(row) : null;
  }

  list(): Project[] {
    return this.db
      .select()
      .from(projects)
      .all()
      .map(toDomain)
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }

  delete(id: WorkspaceId): void {
    this.db.delete(projects).where(eq(projects.id, id)).run();
  }
}
