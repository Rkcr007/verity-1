import {
  GitOperationError,
  ValidationError,
  type WorkspaceId,
} from '@verity/core';
import type {
  GitCheckoutBranchRequest,
  GitCommitRequest,
  GitCommitResponse,
  GitGetDiffRequest,
  GitGetDiffResponse,
  GitListBranchesResponse,
  GitPushRequest,
  GitPushResponse,
  GitStatusDto,
  ProjectScopedRequest,
} from '@verity/core/ipc';
import {
  GitCommandError,
  PushRejectedError,
  checkoutBranch,
  commitChanges,
  createBranch,
  getDiff,
  getStatus,
  listBranches,
  pushCurrentBranch,
} from '@verity/git-engine';
import type { DomainEventBus } from '../event-bus.js';
import type { IProjectService } from './project-service.js';

/**
 * GitService (M6) — project-scoped git operations and domain event emission.
 */
export interface IGitService {
  getStatus(request: ProjectScopedRequest): Promise<GitStatusDto>;
  getDiff(request: GitGetDiffRequest): Promise<GitGetDiffResponse>;
  commit(request: GitCommitRequest): Promise<GitCommitResponse>;
  push(request: GitPushRequest): Promise<GitPushResponse>;
  listBranches(request: ProjectScopedRequest): Promise<GitListBranchesResponse>;
  checkoutBranch(request: GitCheckoutBranchRequest): Promise<GitStatusDto>;
  refreshStatus(projectId: WorkspaceId): Promise<void>;
}

export class GitService implements IGitService {
  private readonly lastChangeCount = new Map<WorkspaceId, number>();

  constructor(
    private readonly projects: IProjectService,
    private readonly bus: DomainEventBus,
  ) {
    this.bus.subscribe('semantic.proposal.applied', (event) => {
      void this.refreshStatus(event.payload.projectId);
    });
  }

  async getStatus(request: ProjectScopedRequest): Promise<GitStatusDto> {
    const status = await this.readStatus(request.projectId);
    this.emitStatusIfChanged(request.projectId, status.changes.length);
    return status;
  }

  async getDiff(request: GitGetDiffRequest): Promise<GitGetDiffResponse> {
    const repoRoot = this.repoRoot(request.projectId);
    const lines = await getDiff(repoRoot, request.path);
    return { lines };
  }

  async commit(request: GitCommitRequest): Promise<GitCommitResponse> {
    const repoRoot = this.repoRoot(request.projectId);
    const settings = this.projects.getSettings(request.projectId);
    const status = await getStatus(repoRoot);
    if (status.hasMergeConflicts) {
      throw new GitOperationError(
        'Resolve merge conflicts before committing.',
        'Unmerged paths detected in working tree.',
      );
    }

    try {
      const result = await commitChanges({
        repoRoot,
        message: request.message,
        files: request.files,
        authorName: settings.git.commitAuthor,
      });

      this.bus.emit(
        'git.committed',
        {
          projectId: request.projectId,
          message: request.message.trim(),
          fileCount: result.fileCount,
        },
        request.projectId,
      );

      await this.refreshStatus(request.projectId);

      return {
        commitSha: result.commitSha,
        fileCount: result.fileCount,
      };
    } catch (error) {
      throw this.mapError(error, 'Commit failed.');
    }
  }

  async push(request: GitPushRequest): Promise<GitPushResponse> {
    const repoRoot = this.repoRoot(request.projectId);

    try {
      const result = await pushCurrentBranch(repoRoot);

      this.bus.emit(
        'git.pushed',
        {
          projectId: request.projectId,
          branch: result.branch,
        },
        request.projectId,
      );

      return result;
    } catch (error) {
      if (error instanceof PushRejectedError) {
        this.bus.emit(
          'git.push.failed',
          {
            projectId: request.projectId,
            reason: error.message,
          },
          request.projectId,
        );
        throw new GitOperationError(error.message, error.stderr);
      }
      throw this.mapError(error, 'Push failed.');
    }
  }

  async listBranches(request: ProjectScopedRequest): Promise<GitListBranchesResponse> {
    const repoRoot = this.repoRoot(request.projectId);
    try {
      return await listBranches(repoRoot);
    } catch (error) {
      throw this.mapError(error, 'Could not list branches.');
    }
  }

  async checkoutBranch(request: GitCheckoutBranchRequest): Promise<GitStatusDto> {
    const repoRoot = this.repoRoot(request.projectId);
    try {
      if (request.create) {
        await createBranch(repoRoot, request.branch);
      } else {
        await checkoutBranch(repoRoot, request.branch);
      }
      const status = await this.readStatus(request.projectId);
      this.emitStatusIfChanged(request.projectId, status.changes.length);
      return status;
    } catch (error) {
      throw this.mapError(error, 'Could not switch branches.');
    }
  }

  async refreshStatus(projectId: WorkspaceId): Promise<void> {
    try {
      const status = await this.readStatus(projectId);
      this.emitStatusIfChanged(projectId, status.changes.length);
    } catch {
      // Non-git folders (demo without .git) should not break proposal apply.
    }
  }

  private async readStatus(projectId: WorkspaceId): Promise<GitStatusDto> {
    const repoRoot = this.repoRoot(projectId);
    const status = await getStatus(repoRoot);

    return {
      branch: status.branch,
      ...(status.upstream !== undefined ? { upstream: status.upstream } : {}),
      ahead: status.ahead,
      behind: status.behind,
      hasMergeConflicts: status.hasMergeConflicts,
      changes: status.changes.map((change) => ({
        path: change.path,
        fileName: change.fileName,
        type: change.type,
      })),
    };
  }

  private repoRoot(projectId: WorkspaceId): string {
    const project = this.projects.get(projectId);
    const path = project.repository.path;
    if (!path) {
      throw new ValidationError('Connect a repository before using git features.');
    }
    return path;
  }

  private emitStatusIfChanged(projectId: WorkspaceId, changeCount: number): void {
    const previous = this.lastChangeCount.get(projectId);
    if (previous === changeCount) return;
    this.lastChangeCount.set(projectId, changeCount);
    this.bus.emit('git.status.changed', { projectId, changeCount }, projectId);
  }

  private mapError(error: unknown, fallback: string): GitOperationError {
    if (error instanceof GitOperationError) return error;
    if (error instanceof ValidationError) {
      return new GitOperationError(error.userMessage, error.detail);
    }
    if (error instanceof GitCommandError) {
      return new GitOperationError(fallback, error.stderr.trim() || error.message);
    }
    if (error instanceof Error) {
      return new GitOperationError(error.message);
    }
    return new GitOperationError(fallback);
  }
}
