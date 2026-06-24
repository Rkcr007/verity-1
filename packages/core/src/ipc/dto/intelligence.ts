import type { WorkspaceId } from '../../ids.js';
import type { Framework } from '../../models/framework.js';

/** Lifecycle of a background repository analysis job. */
export type AnalysisJobStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AnalysisJob {
  readonly jobId: string;
  readonly projectId: WorkspaceId;
  readonly status: AnalysisJobStatus;
  readonly progress: AnalysisProgress;
  readonly error?: string;
}

export interface AnalysisProgress {
  readonly pages: number;
  readonly tests: number;
  readonly pageObjects: number;
  readonly utils: number;
  readonly flows: number;
  readonly understandingScore: number;
}

export interface FileNode {
  readonly name: string;
  readonly path: string;
  readonly type: 'file' | 'directory';
  readonly status: 'clean' | 'added' | 'modified';
  readonly children?: readonly FileNode[];
}

export interface PageDto {
  readonly id: string;
  readonly name: string;
  readonly url?: string;
  /** Semantic description from repository enrichment (E1-S4). */
  readonly description?: string;
  readonly understandingScore: number;
  readonly locatorCount: number;
  /** Repository-relative path of the page object source file (E1-S5). */
  readonly sourcePath?: string;
}

export interface BusinessFlowDto {
  readonly id: string;
  readonly name: string;
  readonly stepCount: number;
  readonly confidence: number;
}

export interface LocatorDto {
  readonly id: string;
  readonly name: string;
  readonly strategy: string;
  readonly selector: string;
  readonly pageName: string;
  readonly confidence: number;
  /** Repository-relative path of the locator source file (E1-S5). */
  readonly sourcePath?: string;
}

export interface ConventionDto {
  readonly baseTestClass?: string;
  readonly pageObjectSuffix?: string;
  readonly testMethodPattern?: string;
  readonly packageRoot?: string;
  readonly testSourceRoot?: string;
}

/** Repository index summary returned over IPC (full payload cached in SQLite). */
export interface RepositoryIndexDto {
  readonly projectId: WorkspaceId;
  readonly version: number;
  readonly understandingScore: number;
  readonly indexedAt: number;
  readonly pages: readonly PageDto[];
  readonly flows: readonly BusinessFlowDto[];
  readonly locators: readonly LocatorDto[];
  readonly conventions: ConventionDto;
}

export interface IntelligenceSummaryDto {
  readonly understandingScore: number;
  readonly pageCount: number;
  readonly flowCount: number;
  readonly locatorCount: number;
  readonly componentCount: number;
}

export interface DetectFrameworkRequest {
  readonly projectId: WorkspaceId;
}

export interface StartAnalysisRequest {
  readonly projectId: WorkspaceId;
}

export interface StartAnalysisResponse {
  readonly jobId: string;
}

export interface GetAnalysisStatusRequest {
  readonly projectId: WorkspaceId;
  readonly jobId?: string;
}

export interface ProjectScopedRequest {
  readonly projectId: WorkspaceId;
}

export type { Framework };
