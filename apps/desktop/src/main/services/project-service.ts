import {
  DEFAULT_PROJECT_SETTINGS,
  NotFoundError,
  ValidationError,
  WorkspaceId,
  type CreateProjectInput,
  type Framework,
  type Project,
  type ProjectSettings,
  type ProjectStats,
  type Repository,
  type WorkspaceStatus,
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
  createDraft(name: string): Project;
  list(): Project[];
  get(id: WorkspaceId): Project;
  open(id: WorkspaceId): Project;
  finalize(id: WorkspaceId): Project;
  updateRepository(id: WorkspaceId, repository: Repository): Project;
  updateFramework(id: WorkspaceId, framework: Framework): Project;
  updateStats(id: WorkspaceId, stats: ProjectStats): Project;
  setStatus(id: WorkspaceId, status: WorkspaceStatus): Project;
  getSettings(id: WorkspaceId): ProjectSettings;
  updateSettings(id: WorkspaceId, settings: ProjectSettings): ProjectSettings;
}

export class ProjectService implements IProjectService {
  constructor(
    private readonly repo: IProjectRepository,
    private readonly bus: DomainEventBus,
  ) {}

  create(input: CreateProjectInput): Project {
    return this.persistNewProject(input.name, input.repository, input.framework);
  }

  createDraft(name: string): Project {
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      throw new ValidationError('Workspace name is required.');
    }
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
    const repository: Repository = {
      source: 'local',
      path: '',
      slug,
      defaultBranch: 'main',
    };
    const framework: Framework = {
      adapterId: 'playwright-java',
      version: 'unknown',
      buildTool: 'unknown',
      testFramework: 'unknown',
      pattern: 'unknown',
    };
    return this.persistNewProject(trimmed, repository, framework);
  }

  private persistNewProject(name: string, repository: Repository, framework: Framework): Project {
    const now = Date.now();
    const project: Project = {
      id: WorkspaceId(),
      name,
      repository,
      framework,
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

  finalize(id: WorkspaceId): Project {
    const project = this.get(id);
    const ready: Project = { ...project, status: 'READY', lastActiveAt: Date.now() };
    this.repo.update(ready);
    this.bus.emit('workspace.status.changed', { status: 'READY' }, id);
    this.bus.emit('project.ready', { projectId: id, status: 'READY' }, id);
    return ready;
  }

  updateRepository(id: WorkspaceId, repository: Repository): Project {
    const project = this.get(id);
    const updated: Project = { ...project, repository, lastActiveAt: Date.now() };
    this.repo.update(updated);
    return updated;
  }

  updateFramework(id: WorkspaceId, framework: Framework): Project {
    const project = this.get(id);
    const updated: Project = {
      ...project,
      framework,
      settings: { ...project.settings, adapterId: framework.adapterId },
      lastActiveAt: Date.now(),
    };
    this.repo.update(updated);
    return updated;
  }

  updateStats(id: WorkspaceId, stats: ProjectStats): Project {
    const project = this.get(id);
    const updated: Project = { ...project, stats, lastActiveAt: Date.now() };
    this.repo.update(updated);
    return updated;
  }

  setStatus(id: WorkspaceId, status: WorkspaceStatus): Project {
    const project = this.get(id);
    const updated: Project = { ...project, status, lastActiveAt: Date.now() };
    this.repo.update(updated);
    this.bus.emit('workspace.status.changed', { status }, id);
    return updated;
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
