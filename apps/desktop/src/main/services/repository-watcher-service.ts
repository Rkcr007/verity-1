import { existsSync, watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import type { WorkspaceId } from '@verity/core';
import { loadIgnorePatterns, shouldIgnorePath } from '@verity/repository-intelligence';
import type { FileChange, FileChangeType } from '@verity/repository-intelligence';
import type { IIndexCacheRepository } from '@verity/local-persistence';
import type { IIntelligenceService } from './intelligence-service.js';
import type { IProjectService } from './project-service.js';
import type { DomainEventBus } from '../event-bus.js';

const DEBOUNCE_MS = 400;

/**
 * Watches the active project's repository and triggers incremental re-indexing (E1-S5).
 */
export interface IRepositoryWatcherService {
  start(): void;
  stopAll(): void;
}

export class RepositoryWatcherService implements IRepositoryWatcherService {
  private watcher: FSWatcher | null = null;
  private activeProjectId: WorkspaceId | null = null;
  private repoRoot = '';
  private readonly pendingChanges = new Map<string, FileChangeType>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly unsubscribes: Array<() => void> = [];

  constructor(
    private readonly projects: IProjectService,
    private readonly intelligence: IIntelligenceService,
    private readonly indexCache: IIndexCacheRepository,
    private readonly bus: DomainEventBus,
  ) {}

  start(): void {
    this.unsubscribes.push(
      this.bus.subscribe('project.opened', (event) => {
        this.ensureWatching(event.payload.projectId);
      }),
    );
    this.unsubscribes.push(
      this.bus.subscribe('repository.analysis.completed', (event) => {
        this.ensureWatching(event.payload.projectId);
      }),
    );
  }

  stopAll(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
    this.stopWatching();
  }

  private ensureWatching(projectId: WorkspaceId): void {
    if (this.activeProjectId === projectId && this.watcher) return;

    this.stopWatching();

    const project = this.projects.get(projectId);
    if (!project.repository.path) return;

    const cached = this.indexCache.findByWorkspaceId(projectId);
    if (!cached) return;

    this.activeProjectId = projectId;
    this.repoRoot = project.repository.path;
    const ignore = loadIgnorePatterns(this.repoRoot);

    this.watcher = watch(this.repoRoot, { recursive: true }, (_eventType, filename) => {
      if (!filename || !this.activeProjectId) return;

      const rel = filename.replace(/\\/g, '/');
      if (shouldIgnorePath(rel, ignore)) return;

      const changeType = resolveChangeType(this.repoRoot, rel);
      this.pendingChanges.set(rel, mergeChangeType(this.pendingChanges.get(rel), changeType));

      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.flushPending(), DEBOUNCE_MS);
    });
  }

  private flushPending(): void {
    this.debounceTimer = null;
    if (!this.activeProjectId || this.pendingChanges.size === 0) return;

    const changes: FileChange[] = [...this.pendingChanges.entries()].map(([path, changeType]) => ({
      path,
      changeType,
    }));
    this.pendingChanges.clear();

    this.intelligence.applyIncrementalUpdate(this.activeProjectId, changes);
  }

  private stopWatching(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges.clear();
    this.watcher?.close();
    this.watcher = null;
    this.activeProjectId = null;
    this.repoRoot = '';
  }
}

function resolveChangeType(repoRoot: string, rel: string): FileChangeType {
  return existsSync(join(repoRoot, rel)) ? 'modified' : 'deleted';
}

function mergeChangeType(
  existing: FileChangeType | undefined,
  incoming: FileChangeType,
): FileChangeType {
  if (!existing) return incoming;
  if (existing === 'deleted' && incoming === 'modified') return 'created';
  return incoming;
}
