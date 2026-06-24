import type { AdapterId } from '../../models/framework.js';
import type { WorkspaceId } from '../../ids.js';

export interface AdapterInfoDto {
  readonly id: AdapterId;
  readonly name: string;
  readonly version: string;
}

export interface PrerequisiteCheckDto {
  readonly name: string;
  readonly satisfied: boolean;
  readonly message: string;
  readonly guidance?: string;
}

export interface PrerequisiteReportDto {
  readonly ready: boolean;
  readonly checks: readonly PrerequisiteCheckDto[];
}

export interface AdapterListRequest {
  readonly projectId: WorkspaceId;
}

export interface AdapterCheckPrerequisitesRequest {
  readonly projectId: WorkspaceId;
}
