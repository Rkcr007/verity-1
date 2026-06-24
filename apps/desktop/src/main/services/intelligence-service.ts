import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { ValidationError, type Framework, type Project, type WorkspaceId } from '@verity/core';
import type {
  AnalysisJob,
  AnalysisProgress,
  FileNode,
  IntelligenceSummaryDto,
  ReadRepositoryFileResponse,
  RepositoryIndexDto,
} from '@verity/core/ipc';
import type { IIndexCacheRepository } from '@verity/local-persistence';
import { buildFileTree, detectBestFramework, scanRepositoryStructure, applyIncrementalChanges } from '@verity/repository-intelligence';
import type { FileChange } from '@verity/repository-intelligence';
import type { IProjectService } from './project-service.js';
import type { DomainEventBus } from '../event-bus.js';

interface JobRecord {
  readonly jobId: string;
  readonly projectId: WorkspaceId;
  status: AnalysisJob['status'];
  progress: AnalysisProgress;
  error?: string;
}

/**
 * IntelligenceService (M1) — framework detection, structural analysis, index cache.
 */
export interface IIntelligenceService {
  detectFramework(projectId: WorkspaceId): Framework;
  startAnalysis(projectId: WorkspaceId): string;
  getAnalysisStatus(projectId: WorkspaceId, jobId?: string): AnalysisJob;
  getIndex(projectId: WorkspaceId): RepositoryIndexDto;
  getFileTree(projectId: WorkspaceId): readonly FileNode[];
  readRepositoryFile(projectId: WorkspaceId, relativePath: string): ReadRepositoryFileResponse;
  getSummary(projectId: WorkspaceId): IntelligenceSummaryDto;
  applyIncrementalUpdate(projectId: WorkspaceId, changes: readonly FileChange[]): void;
}

export class IntelligenceService implements IIntelligenceService {
  private readonly jobs = new Map<string, JobRecord>();

  constructor(
    private readonly projects: IProjectService,
    private readonly indexCache: IIndexCacheRepository,
    private readonly bus: DomainEventBus,
  ) {}

  detectFramework(projectId: WorkspaceId): Framework {
    const project = this.requireRepoPath(projectId);
    const { framework, detection } = detectBestFramework(project.repository.path);

    if (!detection.detected) {
      this.bus.emit(
        'framework.detection.failed',
        { projectId, reasons: [...detection.reasons] },
        projectId,
      );
      throw new ValidationError(
        detection.reasons.length > 0
          ? detection.reasons.join(' · ')
          : 'No supported test framework detected in this repository.',
      );
    }

    this.projects.updateFramework(projectId, framework);
    this.bus.emit('framework.detected', { projectId, framework }, projectId);

    return framework;
  }

  startAnalysis(projectId: WorkspaceId): string {
    const project = this.requireRepoPath(projectId);
    const jobId = randomUUID();

    const record: JobRecord = {
      jobId,
      projectId,
      status: 'running',
      progress: emptyProgress(),
    };
    this.jobs.set(jobId, record);

    this.projects.setStatus(projectId, 'INDEXING');
    this.bus.emit('repository.analysis.started', { projectId, jobId }, projectId);

    setTimeout(() => {
      try {
        const scan = scanRepositoryStructure(project.repository.path);
        record.progress = scan.progress;
        record.status = 'completed';

        const indexedAt = Date.now();
        this.indexCache.upsert({
          workspaceId: projectId,
          version: 1,
          payload: scan.payload,
          contentHash: scan.contentHash,
          indexedAt,
        });

        this.projects.updateStats(projectId, {
          tests: scan.progress.tests,
          pages: scan.progress.pages,
          understandingScore: scan.progress.understandingScore,
        });

        this.bus.emit(
          'repository.analysis.progress',
          { projectId, jobId, progress: scan.progress },
          projectId,
        );
        this.bus.emit(
          'repository.analysis.completed',
          { projectId, jobId, understandingScore: scan.progress.understandingScore },
          projectId,
        );
        this.bus.emit('repository.index.updated', { projectId, version: 1 }, projectId);
      } catch (error) {
        record.status = 'failed';
        record.error = error instanceof Error ? error.message : String(error);
      }
    }, 400);

    return jobId;
  }

  getAnalysisStatus(projectId: WorkspaceId, jobId?: string): AnalysisJob {
    const job = jobId
      ? this.jobs.get(jobId)
      : [...this.jobs.values()].reverse().find((j) => j.projectId === projectId);

    if (!job || job.projectId !== projectId) {
      return {
        jobId: jobId ?? '',
        projectId,
        status: 'idle',
        progress: emptyProgress(),
      };
    }

    return {
      jobId: job.jobId,
      projectId: job.projectId,
      status: job.status,
      progress: job.progress,
      ...(job.error !== undefined ? { error: job.error } : {}),
    };
  }

  getIndex(projectId: WorkspaceId): RepositoryIndexDto {
    const cached = this.indexCache.findByWorkspaceId(projectId);
    if (cached) {
      return {
        projectId,
        version: cached.version,
        understandingScore: cached.payload.understandingScore,
        indexedAt: cached.indexedAt,
        pages: cached.payload.pages,
        flows: cached.payload.flows,
        locators: cached.payload.locators,
        conventions: cached.payload.conventions,
      };
    }

    const project = this.projects.get(projectId);
    return {
      projectId,
      version: 0,
      understandingScore: project.stats.understandingScore,
      indexedAt: 0,
      pages: [],
      flows: [],
      locators: [],
      conventions: {},
    };
  }

  getFileTree(projectId: WorkspaceId): readonly FileNode[] {
    const project = this.requireRepoPath(projectId);
    const cached = this.indexCache.findByWorkspaceId(projectId);
    if (cached?.payload.fileTree.length) {
      return cached.payload.fileTree;
    }
    return buildFileTree(project.repository.path);
  }

  readRepositoryFile(projectId: WorkspaceId, relativePath: string): ReadRepositoryFileResponse {
    const project = this.requireRepoPath(projectId);
    const repoRoot = resolve(project.repository.path);
    const safePath = resolveSafeRepoPath(repoRoot, relativePath);

    let stat;
    try {
      stat = statSync(safePath);
    } catch {
      throw new ValidationError('File not found.', relativePath);
    }
    if (!stat.isFile()) {
      throw new ValidationError('Path is not a file.', relativePath);
    }

    const maxBytes = 512_000;
    const buffer = readFileSync(safePath);
    const truncated = buffer.length > maxBytes;
    const slice = truncated ? buffer.subarray(0, maxBytes) : buffer;
    const content = slice.toString('utf8');

    const normalizedPath = relativePath.replace(/\\/g, '/');
    return {
      path: normalizedPath,
      content,
      language: languageFromPath(normalizedPath),
      truncated,
    };
  }

  getSummary(projectId: WorkspaceId): IntelligenceSummaryDto {
    const cached = this.indexCache.findByWorkspaceId(projectId);
    const project = this.projects.get(projectId);

    if (cached) {
      return {
        understandingScore: cached.payload.understandingScore,
        pageCount: cached.payload.pages.length,
        flowCount: cached.payload.flows.length,
        locatorCount: cached.payload.locators.length,
        componentCount: cached.payload.stats.pageObjects,
      };
    }

    const progress = this.latestProgress(projectId);
    return {
      understandingScore: project.stats.understandingScore,
      pageCount: progress.pages,
      flowCount: progress.flows,
      locatorCount: 0,
      componentCount: progress.pageObjects,
    };
  }

  applyIncrementalUpdate(projectId: WorkspaceId, changes: readonly FileChange[]): void {
    if (changes.length === 0) return;

    const project = this.requireRepoPath(projectId);
    const cached = this.indexCache.findByWorkspaceId(projectId);
    if (!cached) return;

    const legacyIndex =
      cached.payload.pages.some((p) => !p.sourcePath) &&
      changes.some((c) => c.path.endsWith('.java'));

    if (legacyIndex) {
      const scan = scanRepositoryStructure(project.repository.path);
      const newVersion = cached.version + 1;
      this.indexCache.upsert({
        workspaceId: projectId,
        version: newVersion,
        payload: scan.payload,
        contentHash: scan.contentHash,
        indexedAt: Date.now(),
      });
      this.projects.updateStats(projectId, {
        tests: scan.progress.tests,
        pages: scan.progress.pages,
        understandingScore: scan.progress.understandingScore,
      });
      this.bus.emit('repository.index.updated', { projectId, version: newVersion }, projectId);
      return;
    }

    const result = applyIncrementalChanges(project.repository.path, cached.payload, changes);

    for (const change of changes) {
      this.bus.emit(
        'repository.file.changed',
        { projectId, path: change.path, changeType: change.changeType },
        projectId,
      );
    }

    const newVersion = cached.version + 1;
    this.indexCache.upsert({
      workspaceId: projectId,
      version: newVersion,
      payload: result.payload,
      contentHash: result.contentHash,
      indexedAt: Date.now(),
    });

    this.projects.updateStats(projectId, {
      tests: result.payload.stats.tests,
      pages: result.payload.stats.pages,
      understandingScore: result.payload.understandingScore,
    });

    this.bus.emit('repository.index.updated', { projectId, version: newVersion }, projectId);
  }

  private requireRepoPath(projectId: WorkspaceId): Project {
    const project = this.projects.get(projectId);
    if (!project.repository.path) {
      throw new ValidationError('Connect a repository before running intelligence.');
    }
    return project;
  }

  private latestProgress(projectId: WorkspaceId): AnalysisProgress {
    const job = [...this.jobs.values()].reverse().find((j) => j.projectId === projectId);
    return job?.progress ?? emptyProgress();
  }
}

function emptyProgress(): AnalysisProgress {
  return {
    pages: 0,
    tests: 0,
    pageObjects: 0,
    utils: 0,
    flows: 0,
    understandingScore: 0,
  };
}

function resolveSafeRepoPath(repoRoot: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..')) {
    throw new ValidationError('Invalid file path.');
  }
  const absolute = resolve(repoRoot, normalized);
  const relCheck = relative(repoRoot, absolute);
  if (relCheck.startsWith('..') || isAbsolute(relCheck)) {
    throw new ValidationError('Path escapes repository root.');
  }
  return absolute;
}

function languageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    java: 'java',
    py: 'python',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    md: 'markdown',
    properties: 'properties',
  };
  return map[ext] ?? 'plaintext';
}
