import type { AdapterId, WorkspaceId } from '@verity/core';
import type { PrerequisiteReport, TestAdapter } from '@verity/adapter-contract';
import { pickBestDetection, type DetectionResult } from '@verity/adapter-contract';
import type { SemanticTestDto } from '@verity/core/ipc';
import { transpileSemanticTest as transpileJava } from '@verity/adapter-playwright-java';
import { playwrightJavaAdapter } from '@verity/adapter-playwright-java';
import { transpileSemanticTest as transpileTypeScript } from '@verity/adapter-playwright-typescript';
import { playwrightTypeScriptAdapter } from '@verity/adapter-playwright-typescript';
import type { IIndexCacheRepository } from '@verity/local-persistence';
import { fromSemanticTestDto } from '../mappers/semantic-mapper.js';
import { toRepositoryIndexSnapshot } from '../mappers/index-snapshot-mapper.js';
import type { IProjectService } from './project-service.js';

export interface AdapterInfoDto {
  readonly id: AdapterId;
  readonly name: string;
  readonly version: string;
}

/**
 * AdapterRegistry (M3 E3-S3) — resolves active adapter and delegates transpile/prerequisites.
 */
export interface IAdapterRegistryService {
  list(): readonly AdapterInfoDto[];
  detectBest(repoRoot: string): DetectionResult | null;
  getActiveAdapterId(projectId: WorkspaceId): AdapterId;
  checkPrerequisites(projectId: WorkspaceId): PrerequisiteReport;
  transpilePreview(projectId: WorkspaceId, test: SemanticTestDto): ReturnType<TestAdapter['transpile']>;
  resolveAdapter(id: AdapterId): TestAdapter;
}

export class AdapterRegistryService implements IAdapterRegistryService {
  private readonly adapters = new Map<AdapterId, TestAdapter>();

  constructor(
    private readonly projects: IProjectService,
    private readonly indexCache: IIndexCacheRepository,
  ) {
    this.register(playwrightJavaAdapter);
    this.register(playwrightTypeScriptAdapter);
  }

  register(adapter: TestAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  list(): readonly AdapterInfoDto[] {
    return [...this.adapters.values()].map((a) => ({
      id: a.id,
      name: a.name,
      version: a.version,
    }));
  }

  detectBest(repoRoot: string): DetectionResult | null {
    const results = [...this.adapters.values()].map((a) => resolveDetection(a.detect(repoRoot)));
    return pickBestDetection(results);
  }

  getActiveAdapterId(projectId: WorkspaceId): AdapterId {
    return this.projects.get(projectId).framework.adapterId;
  }

  checkPrerequisites(projectId: WorkspaceId): PrerequisiteReport {
    const project = this.projects.get(projectId);
    const adapter = this.requireAdapter(project.framework.adapterId);
    return resolvePrerequisites(adapter.checkPrerequisites(project.repository.path ?? ''));
  }

  transpilePreview(projectId: WorkspaceId, test: SemanticTestDto) {
    const project = this.projects.get(projectId);
    this.requireAdapter(test.adapter);
    const semanticTest = fromSemanticTestDto(test);
    const cached = this.indexCache.findByWorkspaceId(projectId);
    const index = toRepositoryIndexSnapshot(projectId, cached);
    const repoRoot = project.repository.path ?? '';

    if (test.adapter === 'playwright-java') {
      return transpileJava(semanticTest, index, repoRoot);
    }

    if (test.adapter === 'playwright-typescript') {
      return transpileTypeScript(semanticTest, index);
    }

    return this.requireAdapter(test.adapter).transpile(semanticTest, index);
  }

  resolveAdapter(id: AdapterId): TestAdapter {
    return this.requireAdapter(id);
  }

  private requireAdapter(id: AdapterId): TestAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`No adapter registered for ${id}`);
    }
    return adapter;
  }
}

function resolveDetection(result: DetectionResult | Promise<DetectionResult>): DetectionResult {
  if (result instanceof Promise) {
    throw new Error('Async adapter detection is not supported in AdapterRegistry yet.');
  }
  return result;
}

function resolvePrerequisites(
  result: PrerequisiteReport | Promise<PrerequisiteReport>,
): PrerequisiteReport {
  if (result instanceof Promise) {
    throw new Error('Async prerequisite checks are not supported in AdapterRegistry yet.');
  }
  return result;
}
