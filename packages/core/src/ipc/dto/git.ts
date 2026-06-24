import type { WorkspaceId } from '../../ids.js';

export type GitChangeType = 'A' | 'M' | 'D';

export interface GitStatusChangedPayload {
  readonly projectId: WorkspaceId;
  readonly changeCount: number;
}

export interface GitCommittedPayload {
  readonly projectId: WorkspaceId;
  readonly message: string;
  readonly fileCount: number;
}

export interface GitPushedPayload {
  readonly projectId: WorkspaceId;
  readonly branch: string;
}

export interface GitPushFailedPayload {
  readonly projectId: WorkspaceId;
  readonly reason: string;
}
