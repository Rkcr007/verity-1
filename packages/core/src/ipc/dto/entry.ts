import type { AdapterId, Project, WorkspaceId } from '../../index.js';
import type { EnvironmentSetupResultDto } from './framework-intelligence.js';

export type WizardEntryMode = 'greenfield' | 'existing' | 'migrate' | 'demo';

export type FolderEntryKind = 'empty' | 'playwright-java' | 'selenium-java' | 'unknown';

export type SuggestedWizardMode = 'greenfield' | 'existing' | 'migrate';

export interface FolderInspectionDto {
  readonly path: string;
  readonly isEmpty: boolean;
  readonly entryKind: FolderEntryKind;
  readonly suggestedMode: SuggestedWizardMode;
  readonly headline: string;
  readonly detail: string;
}

export interface InspectFolderRequest {
  readonly path: string;
}

export interface EntryRecommendationDto {
  readonly mode: WizardEntryMode;
  readonly headline: string;
  readonly reasons: readonly string[];
  readonly confidence: number;
}

export interface RecommendEntryRequest {
  readonly path?: string;
}

export interface ScaffoldGreenfieldRequest {
  readonly projectId: WorkspaceId;
  readonly localPath: string;
  readonly adapterId?: AdapterId;
  readonly appDescription?: string;
}

export interface ScaffoldGreenfieldResponse {
  readonly project: Project;
  readonly filesCreated: number;
  readonly setup: EnvironmentSetupResultDto;
}

export interface GetRecentProjectResponse {
  readonly project: Project | null;
}

export interface MigrationStepDto {
  readonly phase: string;
  readonly title: string;
  readonly detail: string;
}

export interface MigrationPlanDto {
  readonly sourceAdapter: 'selenium-java';
  readonly targetAdapter: 'playwright-java';
  readonly steps: readonly MigrationStepDto[];
  readonly estimatedEffort: 'incremental' | 'moderate' | 'large';
}

export interface GetMigrationPlanRequest {
  readonly projectId: WorkspaceId;
}
