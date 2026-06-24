import {
  DEFAULT_PROJECT_SETTINGS,
  NotFoundError,
  WorkspaceId,
  type CreateProjectInput,
  type Project,
  type ProjectSettings,
} from '@verity/core';
import type { IProjectRepository } from '@verity/local-persistence';
import type { DomainEventBus } from '../event-bus.js';

/**
 * ProjectService (resolution I-04, architecture §2.1).
 *
 * Owns the Project/Workspace aggregate lifecycle. The only EPIC 0 service with
 * real behavior: it persists projects, lists them, opens them (touching
 * lastActiveAt), and reads/writes settings. Status transitions and creation
 * emit domain events through the bus (resolution E-01).
 */
export interface IProjectService {
  create(input: CreateProjectInput): Project;
  list(): Project[];
  get(id: WorkspaceId): Project;
  open(id: WorkspaceId): Project;
  getSettings(id: WorkspaceId): ProjectSettings;
  updateSettings(id: WorkspaceId, settings: ProjectSettings): ProjectSettings;
}

export class ProjectService implements IProjectService {
  constructor(
    private readonly repo: IProjectRepository,
    private readonly bus: DomainEventBus,
  ) {}

  create(input: CreateProjectInput): Project {
    const now = Date.now();
    const project: Project = {
      id: WorkspaceId(),
      name: input.name,
      repository: input.repository,
      framework: input.framework,
      status: 'CREATED',
      stats: { tests: 0, pages: 0, understandingScore: 0 },
      settings: DEFAULT_PROJECT_SETTINGS,
      createdAt: now,
      lastActiveAt: now,
    };
    this.repo.insert(project);
    this.bus.emit('project.created', { projectId: project.id, name: project.name }, project.id);
    this.bus.emit('workspace.status.changed', { status: project.status }, project.id);
    return project;
  }

  list(): Project[] {
    return this.repo.list();
  }

  get(id: WorkspaceId): Project {
    const project = this.repo.findById(id);
    if (!project) throw new NotFoundError('Project not found.', id);
    return project;
  }

  open(id: WorkspaceId): Project {
    const project = this.get(id);
    const opened: Project = { ...project, lastActiveAt: Date.now() };
    this.repo.update(opened);
    this.bus.emit('project.opened', { projectId: id }, id);
    return opened;
  }

  getSettings(id: WorkspaceId): ProjectSettings {
    return this.get(id).settings;
  }

  updateSettings(id: WorkspaceId, settings: ProjectSettings): ProjectSettings {
    const project = this.get(id);
    this.repo.update({ ...project, settings, lastActiveAt: Date.now() });
    return settings;
  }
}
