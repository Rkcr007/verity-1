import { existsSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { dialog } from 'electron';
import { ValidationError, type Project, type Repository, type WorkspaceId } from '@verity/core';
import type { OAuthProvider, PickFolderResponse } from '@verity/core/ipc';
import type { IProjectService } from './project-service.js';
import { detectDefaultBranch } from '@verity/repository-intelligence';
import type { DomainEventBus } from '../event-bus.js';

/**
 * RepositoryConnectorService (M1 E1-S1) — local folder connection and OAuth stubs.
 */
export interface IRepositoryConnectorService {
  pickFolder(): Promise<PickFolderResponse>;
  connectLocal(projectId: WorkspaceId, localPath: string): Project;
  startOAuth(provider: OAuthProvider): { started: boolean; authorizationUrl?: string };
  getOAuthStatus(provider: OAuthProvider): { connected: boolean; username?: string };
}

export class RepositoryConnectorService implements IRepositoryConnectorService {
  constructor(
    private readonly projects: IProjectService,
    private readonly bus: DomainEventBus,
  ) {}

  async pickFolder(): Promise<PickFolderResponse> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select a test repository folder',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }
    const path = result.filePaths[0];
    if (!path) return { cancelled: true };
    return { path };
  }

  connectLocal(projectId: WorkspaceId, localPath: string): Project {
    const resolved = localPath.trim();
    if (!resolved) {
      throw new ValidationError('Choose a folder path for the repository.');
    }
    if (!existsSync(resolved)) {
      throw new ValidationError('That folder does not exist.', resolved);
    }
    let isDir = false;
    try {
      isDir = statSync(resolved).isDirectory();
    } catch {
      throw new ValidationError('Could not read the selected folder.');
    }
    if (!isDir) {
      throw new ValidationError('The selected path is not a folder.');
    }

    this.projects.get(projectId);
    const slug = basename(resolved);
    const repository: Repository = {
      source: 'local',
      path: resolved,
      slug,
      defaultBranch: detectDefaultBranch(resolved),
    };

    const updated = this.projects.updateRepository(projectId, repository);
    this.bus.emit(
      'repository.connected',
      { projectId, source: repository.source, path: repository.path },
      projectId,
    );
    return updated;
  }

  startOAuth(provider: OAuthProvider): { started: boolean; authorizationUrl?: string } {
    // OAuth PKCE flow ships in M1 follow-up; wizard shows GitHub as "coming soon".
    void provider;
    return { started: false };
  }

  getOAuthStatus(provider: OAuthProvider): { connected: boolean; username?: string } {
    void provider;
    return { connected: false };
  }
}
