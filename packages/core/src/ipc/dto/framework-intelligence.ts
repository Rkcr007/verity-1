import type { AdapterId } from '../../index.js';

import type { WorkspaceId } from '../../index.js';

export type FrameworkMaturity = 'available' | 'preview' | 'planned';
export type EnterpriseTier = 'leader' | 'standard' | 'emerging';

export interface FrameworkCatalogEntryDto {
  readonly adapterId: AdapterId;
  readonly displayName: string;
  readonly language: string;
  readonly buildTool: string;
  readonly testRunner: string;
  readonly pattern: string;
  readonly maturity: FrameworkMaturity;
  readonly enterpriseTier: EnterpriseTier;
  readonly adoptionNote: string;
  readonly latestVersion: string;
  readonly dependencies: readonly string[];
  readonly scaffoldSupported: boolean;
  readonly tags: readonly string[];
}

export interface GetFrameworkCatalogResponse {
  readonly entries: readonly FrameworkCatalogEntryDto[];
}

export type RecommendFrameworkMode = 'greenfield' | 'migrate' | 'existing';

export interface RecommendFrameworkRequest {
  readonly mode: RecommendFrameworkMode;
  readonly appDescription?: string;
  readonly languagePreference?: 'java' | 'typescript' | 'python' | 'javascript';
  /** Local repo path — enables connect/migrate signal analysis (M1.7). */
  readonly repoPath?: string;
}

export interface FrameworkRecommendationDto {
  readonly recommended: FrameworkCatalogEntryDto;
  readonly alternatives: readonly FrameworkCatalogEntryDto[];
  readonly reasons: readonly string[];
  readonly confidence: number;
  readonly source?: 'llm' | 'rules';
}

export type EnvironmentSetupStepStatus = 'ok' | 'failed' | 'skipped';

export interface EnvironmentSetupStepDto {
  readonly name: string;
  readonly status: EnvironmentSetupStepStatus;
  readonly detail: string;
}

export interface EnvironmentSetupResultDto {
  readonly steps: readonly EnvironmentSetupStepDto[];
  readonly ready: boolean;
}

export interface SetupEnvironmentRequest {
  readonly projectId: WorkspaceId;
}

export interface SetupEnvironmentResponse {
  readonly setup: EnvironmentSetupResultDto;
}

export interface InstallToolchainRequest {
  readonly adapterId: AdapterId;
}

export interface InstallToolchainResponse {
  readonly setup: EnvironmentSetupResultDto;
}
