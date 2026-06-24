import type {
  BusinessFlowDto,
  ConventionDto,
  FileNode,
  LocatorDto,
  PageDto,
} from '@verity/core/ipc';

/**
 * Serialized repository index stored in SQLite `index_cache.payload`.
 * `projectId`, `version`, and `indexedAt` live on the table row.
 */
export interface IndexCachePayload {
  readonly understandingScore: number;
  readonly pages: readonly PageDto[];
  readonly flows: readonly BusinessFlowDto[];
  readonly locators: readonly LocatorDto[];
  readonly conventions: ConventionDto;
  readonly fileTree: readonly FileNode[];
  readonly stats: IndexScanStats;
  readonly fileContributions?: Readonly<Record<string, FileContribution>>;
  readonly nonJavaTests?: number;
}

export interface FileContribution {
  readonly tests: number;
  readonly pageObjectId?: string;
  readonly isUtil: boolean;
}

export interface IndexScanStats {
  readonly tests: number;
  readonly pages: number;
  readonly pageObjects: number;
  readonly utils: number;
  readonly flows: number;
}

export function emptyIndexCachePayload(): IndexCachePayload {
  return {
    understandingScore: 0,
    pages: [],
    flows: [],
    locators: [],
    conventions: {},
    fileTree: [],
    stats: { tests: 0, pages: 0, pageObjects: 0, utils: 0, flows: 0 },
  };
}
