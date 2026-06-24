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

export type { RepositorySource };
