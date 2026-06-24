import type { FlowId, LocatorId, PageId, PageObjectId, WorkspaceId } from '@verity/core';

/**
 * Read-only page snapshot passed to adapters during transpilation.
 */
export interface PageSnapshot {
  readonly id: PageId;
  readonly name: string;
  readonly url?: string;
  readonly understandingScore?: number;
}

/**
 * Read-only page object snapshot for code generation.
 */
export interface PageObjectSnapshot {
  readonly id: PageObjectId;
  readonly name: string;
  readonly className: string;
  readonly filePath: string;
  readonly pageName?: string;
}

/**
 * Read-only locator snapshot resolved from repository intelligence.
 */
export interface LocatorSnapshot {
  readonly id: LocatorId;
  readonly name: string;
  readonly strategy: string;
  readonly selector: string;
  readonly filePath: string;
  readonly line?: number;
  readonly confidence: number;
  readonly pageName?: string;
}

/**
 * Named multi-page user sequence (business flow).
 */
export interface BusinessFlowSnapshot {
  readonly id: FlowId;
  readonly name: string;
  readonly stepCount: number;
  readonly confidence: number;
}

/**
 * Detected repository naming and layout conventions.
 */
export interface ConventionSnapshot {
  readonly baseTestClass?: string;
  readonly pageObjectSuffix?: string;
  readonly testMethodPattern?: string;
  readonly annotationStyle?: string;
  readonly packageRoot?: string;
  readonly testSourceRoot?: string;
}

/**
 * Minimal repository index snapshot adapters consume (architecture §9.1).
 *
 * Full RepositoryIndex lives in repository-intelligence; this DTO is the ACL
 * surface adapters may depend on without importing that package.
 */
export interface RepositoryIndexSnapshot {
  readonly workspaceId: WorkspaceId;
  readonly version: number;
  readonly understandingScore: number;
  readonly pages: readonly PageSnapshot[];
  readonly pageObjects: readonly PageObjectSnapshot[];
  readonly locators: readonly LocatorSnapshot[];
  readonly flows: readonly BusinessFlowSnapshot[];
  readonly conventions: ConventionSnapshot;
}

/** Empty index for detection-only adapter calls. */
export function emptyRepositoryIndexSnapshot(workspaceId: WorkspaceId): RepositoryIndexSnapshot {
  return {
    workspaceId,
    version: 0,
    understandingScore: 0,
    pages: [],
    pageObjects: [],
    locators: [],
    flows: [],
    conventions: {},
  };
}
