import type { Repository, RepositorySource } from '../../models/repository.js';
import type { WorkspaceId } from '../../ids.js';
import type { Project } from '../../models/project.js';

/** OAuth provider supported for remote repository connection (M1+). */
export type OAuthProvider = 'github' | 'gitlab';

/**
 * Connect a local folder to an existing project workspace.
 */
export interface ConnectLocalRepositoryRequest {
  readonly projectId: WorkspaceId;
  /** Absolute path chosen via folder picker or typed path. */
  readonly localPath: string;
}

export interface ConnectLocalRepositoryResponse {
  readonly project: Project;
  readonly repository: Repository;
}

/** Result of the native folder-picker dialog (main process only). */
export type PickFolderResponse = { readonly cancelled: true } | { readonly path: string };

/** Create a new folder under a chosen parent (greenfield convenience). */
export interface CreateProjectFolderRequest {
  readonly parentPath: string;
  readonly folderName: string;
}

export interface CreateProjectFolderResponse {
  readonly path: string;
}

export interface OAuthStartRequest {
  readonly provider: OAuthProvider;
}

export interface OAuthStartResponse {
  readonly started: boolean;
  /** Present when the system browser should open for authorization. */
  readonly authorizationUrl?: string;
}

export interface OAuthStatusRequest {
  readonly provider: OAuthProvider;
}

export interface OAuthStatusResponse {
  readonly connected: boolean;
  readonly username?: string;
}

/** Read a text file from the connected repository (workspace editor preview). */
export interface ReadRepositoryFileRequest {
  readonly projectId: WorkspaceId;
  /** Repository-relative path (forward slashes). */
  readonly relativePath: string;
}

export interface ReadRepositoryFileResponse {
  readonly path: string;
  readonly content: string;
  readonly language: string;
  readonly truncated: boolean;
}

export type { RepositorySource };
