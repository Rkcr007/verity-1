import type { WorkspaceId } from '../ids.js';
import type { Framework } from './framework.js';
import type { Repository } from './repository.js';
import type { ProjectSettings } from './settings.js';

/**
 * WorkspaceStatus — lifecycle of the Project/Workspace aggregate (architecture §3.2).
 * Transitions are surfaced via the `workspace.status.changed` event (resolution E-01).
 */
export type WorkspaceStatus = 'CREATED' | 'INDEXING' | 'READY' | 'STALE';

/**
 * Denormalized snapshot of headline counts shown on the Projects screen.
 * NOT authoritative — recomputed from the RepositoryIndex (resolution M-01).
 */
export interface ProjectStats {
  readonly tests: number;
  readonly pages: number;
  /** Repository Understanding Score, 0–100. */
  readonly understandingScore: number;
}

/**
 * Project — the canonical persisted aggregate (resolutions X-01, M-01).
 *
 * Named "Project" in persistence; referred to as "Workspace" in the UI and as
 * the aggregate root in the domain. One Project maps to exactly one Repository.
 */
export interface Project {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly repository: Repository;
  readonly framework: Framework;
  readonly status: WorkspaceStatus;
  readonly stats: ProjectStats;
  readonly settings: ProjectSettings;
  readonly createdAt: number;
  readonly lastActiveAt: number;
}

/** Fields accepted when creating a Project. The id/timestamps/status are assigned by the service. */
export interface CreateProjectInput {
  readonly name: string;
  readonly repository: Repository;
  readonly framework: Framework;
}
