import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { PersistenceError } from '@verity/core';
import * as schema from './schema.js';
import { SCHEMA_DDL } from './schema.js';

export type VerityDatabase = BetterSQLite3Database<typeof schema>;

/**
 * Opens (and lazily migrates) the local SQLite database (architecture §2.1).
 *
 * The MVP uses an idempotent DDL bootstrap (`CREATE TABLE IF NOT EXISTS`) rather
 * than file-based migrations; a versioned migration runner replaces this when the
 * schema starts evolving. WAL mode is enabled for concurrent reads during runs.
 */
export function openDatabase(filePath: string): { db: VerityDatabase; close: () => void } {
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const sqlite = new Database(filePath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(SCHEMA_DDL);

    const db = drizzle(sqlite, { schema });
    return { db, close: () => sqlite.close() };
  } catch (error) {
    throw new PersistenceError(
      'Could not open the local database.',
      error instanceof Error ? error.message : String(error),
    );
  }
}
