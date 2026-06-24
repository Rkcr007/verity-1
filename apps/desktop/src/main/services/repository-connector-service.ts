import { existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
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
  pickParentFolder(): Promise<PickFolderResponse>;
  createProjectFolder(parentPath: string, folderName: string): { path: string };
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
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select a test repository folder',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }
    const path = result.filePaths[0];
    if (!path) return { cancelled: true };
    return { path };
  }

  async pickParentFolder(): Promise<PickFolderResponse> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Choose where to create your project',
      buttonLabel: 'Select location',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }
    const path = result.filePaths[0];
    if (!path) return { cancelled: true };
    return { path };
  }

  createProjectFolder(parentPath: string, folderName: string): { path: string } {
    const parent = parentPath.trim();
    const rawName = folderName.trim();
    if (!parent) {
      throw new ValidationError('Choose a parent location first.');
    }
    if (!rawName) {
      throw new ValidationError('Enter a folder name for your new project.');
    }

    const safeName = rawName.replace(/[/\\<>:"|?*]/g, '-').replace(/\.+$/g, '');
    if (safeName.length < 1) {
      throw new ValidationError('Folder name contains invalid characters.');
    }

    if (!existsSync(parent)) {
      throw new ValidationError('Parent folder does not exist.', parent);
    }
    try {
      if (!statSync(parent).isDirectory()) {
        throw new ValidationError('Parent path is not a folder.');
      }
    } catch {
      throw new ValidationError('Could not read the parent folder.');
    }

    const target = join(parent, safeName);
    if (existsSync(target)) {
      throw new ValidationError(
        'A folder with that name already exists.',
        'Pick a different name or choose another location.',
      );
    }

    mkdirSync(target, { recursive: false });
    return { path: target };
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
