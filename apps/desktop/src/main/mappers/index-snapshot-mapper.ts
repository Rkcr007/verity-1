import { FlowId, LocatorId, PageId, PageObjectId } from '@verity/core';
import type { WorkspaceId } from '@verity/core';
import type { RepositoryIndexSnapshot } from '@verity/adapter-contract';
import { emptyRepositoryIndexSnapshot } from '@verity/adapter-contract';
import type { IndexCacheRecord } from '@verity/local-persistence';

/**
 * Map SQLite index cache to the adapter ACL snapshot (M3).
 */
export function toRepositoryIndexSnapshot(
  projectId: WorkspaceId,
  cached: IndexCacheRecord | null,
): RepositoryIndexSnapshot {
  if (!cached) {
    return emptyRepositoryIndexSnapshot(projectId);
  }

  const payload = cached.payload;

  return {
    workspaceId: projectId,
    version: cached.version,
    understandingScore: payload.understandingScore,
    pages: payload.pages.map((p) => ({
      id: PageId(p.id),
      name: p.name,
      ...(p.url !== undefined ? { url: p.url } : {}),
      understandingScore: p.understandingScore,
    })),
    pageObjects: payload.pages
      .filter((p): p is typeof p & { sourcePath: string } => Boolean(p.sourcePath))
      .map((p) => ({
        id: PageObjectId(p.id),
        name: p.name,
        className: p.id,
        filePath: p.sourcePath,
        pageName: p.name,
      })),
    locators: payload.locators.map((l) => ({
      id: LocatorId(l.id),
      name: l.name,
      strategy: l.strategy,
      selector: l.selector,
      filePath: l.sourcePath ?? '',
      confidence: l.confidence,
      pageName: l.pageName,
    })),
    flows: payload.flows.map((f) => ({
      id: FlowId(f.id),
      name: f.name,
      stepCount: f.stepCount,
      confidence: f.confidence,
    })),
    conventions: payload.conventions,
  };
}
