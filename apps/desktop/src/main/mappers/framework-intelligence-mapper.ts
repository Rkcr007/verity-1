import type { AdapterId } from '@verity/core';
import type {
  EnvironmentSetupResultDto,
  FrameworkCatalogEntryDto,
  FrameworkRecommendationDto,
  RecommendFrameworkRequest,
} from '@verity/core/ipc';
import type {
  FrameworkCatalogEntry,
  FrameworkRecommendation,
  RecommendFrameworkInput,
} from '@verity/repository-intelligence';

export function toFrameworkCatalogEntryDto(entry: FrameworkCatalogEntry): FrameworkCatalogEntryDto {
  return {
    adapterId: entry.adapterId,
    displayName: entry.displayName,
    language: entry.language,
    buildTool: entry.buildTool,
    testRunner: entry.testRunner,
    pattern: entry.pattern,
    maturity: entry.maturity,
    enterpriseTier: entry.enterpriseTier,
    adoptionNote: entry.adoptionNote,
    latestVersion: entry.latestVersion,
    dependencies: entry.dependencies,
    scaffoldSupported: entry.scaffoldSupported,
    tags: entry.tags,
  };
}

export function toFrameworkRecommendationDto(
  rec: FrameworkRecommendation,
  source?: 'llm' | 'rules',
): FrameworkRecommendationDto {
  return {
    recommended: toFrameworkCatalogEntryDto(rec.recommended),
    alternatives: rec.alternatives.map(toFrameworkCatalogEntryDto),
    reasons: rec.reasons,
    confidence: rec.confidence,
    ...(source ? { source } : {}),
  };
}

interface SetupResultLike {
  readonly steps: readonly { readonly name: string; readonly status: 'ok' | 'failed' | 'skipped'; readonly detail: string }[];
  readonly ready: boolean;
}

export function toEnvironmentSetupResultDto(result: SetupResultLike): EnvironmentSetupResultDto {
  return {
    steps: result.steps.map((s) => ({
      name: s.name,
      status: s.status,
      detail: s.detail,
    })),
    ready: result.ready,
  };
}

export function resolveScaffoldAdapterId(adapterId?: AdapterId): AdapterId {
  return adapterId ?? 'playwright-java';
}

export function mapRecommendFrameworkRequest(request: RecommendFrameworkRequest): RecommendFrameworkInput {
  return {
    mode: request.mode,
    ...(request.appDescription?.trim() ? { appDescription: request.appDescription.trim() } : {}),
    ...(request.languagePreference ? { languagePreference: request.languagePreference } : {}),
    ...(request.repoPath?.trim() ? { repoPath: request.repoPath.trim() } : {}),
  };
}
