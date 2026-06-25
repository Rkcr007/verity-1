import type { WorkspaceId } from '../../ids.js';

export type GitChangeType = 'A' | 'M' | 'D' | 'U';

export interface GitChangeDto {
  readonly path: string;
  readonly fileName: string;
  readonly type: GitChangeType;
  readonly summary?: string;
}

export interface GitStatusDto {
  readonly branch: string;
  readonly upstream?: string;
  readonly ahead: number;
  readonly behind: number;
  readonly hasMergeConflicts: boolean;
  readonly changes: readonly GitChangeDto[];
}

export interface GitCheckoutBranchRequest {
  readonly projectId: WorkspaceId;
  readonly branch: string;
  readonly create?: boolean;
}

export interface GitGetDiffRequest {
  readonly projectId: WorkspaceId;
  readonly path: string;
}

export interface GitGetDiffResponse {
  readonly lines: readonly DiffLineDto[];
}

export type DiffLineKind = '+' | '-' | ' ';

export interface DiffLineDto {
  readonly kind: DiffLineKind;
  readonly content: string;
}

export interface GitCommitRequest {
  readonly projectId: WorkspaceId;
  readonly message: string;
  readonly files: readonly string[];
}

export interface GitCommitResponse {
  readonly commitSha: string;
  readonly fileCount: number;
}

export interface GitPushRequest {
  readonly projectId: WorkspaceId;
}

export interface GitPushResponse {
  readonly branch: string;
  readonly remote: string;
}

export interface GitListBranchesResponse {
  readonly current: string;
  readonly branches: readonly string[];
}

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
