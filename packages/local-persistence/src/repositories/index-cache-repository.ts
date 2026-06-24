import { eq } from 'drizzle-orm';
import type { WorkspaceId } from '@verity/core';
import { PersistenceError } from '@verity/core';
import type { VerityDatabase } from '../database.js';
import { indexCache } from '../schema.js';
import type { IndexCachePayload } from '../types/index-cache-payload.js';

export interface IndexCacheRecord {
  readonly workspaceId: WorkspaceId;
  readonly version: number;
  readonly payload: IndexCachePayload;
  readonly contentHash: string;
  readonly indexedAt: number;
}

export interface IIndexCacheRepository {
  upsert(record: IndexCacheRecord): void;
  findByWorkspaceId(workspaceId: WorkspaceId): IndexCacheRecord | null;
  delete(workspaceId: WorkspaceId): void;
}

type IndexCacheRow = typeof indexCache.$inferSelect;

function toRecord(row: IndexCacheRow): IndexCacheRecord {
  return {
    workspaceId: row.workspaceId as WorkspaceId,
    version: row.version,
    payload: row.payload as IndexCachePayload,
    contentHash: row.contentHash,
    indexedAt: row.indexedAt,
  };
}

export class IndexCacheRepository implements IIndexCacheRepository {
  constructor(private readonly db: VerityDatabase) {}

  upsert(record: IndexCacheRecord): void {
    try {
      this.db
        .insert(indexCache)
        .values({
          workspaceId: record.workspaceId,
          version: record.version,
          payload: record.payload,
          contentHash: record.contentHash,
          indexedAt: record.indexedAt,
        })
        .onConflictDoUpdate({
          target: indexCache.workspaceId,
          set: {
            version: record.version,
            payload: record.payload,
            contentHash: record.contentHash,
            indexedAt: record.indexedAt,
          },
        })
        .run();
    } catch (error) {
      throw new PersistenceError(
        'Could not save the repository index.',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  findByWorkspaceId(workspaceId: WorkspaceId): IndexCacheRecord | null {
    const row = this.db
      .select()
      .from(indexCache)
      .where(eq(indexCache.workspaceId, workspaceId))
      .get();
    return row ? toRecord(row) : null;
  }

  delete(workspaceId: WorkspaceId): void {
    this.db.delete(indexCache).where(eq(indexCache.workspaceId, workspaceId)).run();
  }
}
