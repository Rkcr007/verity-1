import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * SQLite schema (architecture §2.1 / E0-S3, resolutions D-01..D-03).
 *
 * EPIC 0 creates the `projects` table (the persisted Project/Workspace/Repository
 * aggregate, resolution X-01) and declares the remaining tables that later epics
 * fill (runs, run_steps, index_cache, evidence_refs, api_usage). Per the readiness
 * review, settings & stats live as JSON columns on `projects` (D-02), and failure
 * classification will live as JSON columns on `runs` (D-03).
 */

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  /** Repository value object, JSON-encoded. */
  repository: text('repository', { mode: 'json' }).notNull(),
  /** Framework value object, JSON-encoded. */
  framework: text('framework', { mode: 'json' }).notNull(),
  /** Denormalized ProjectStats snapshot, JSON-encoded (D-01). */
  stats: text('stats', { mode: 'json' }).notNull(),
  /** ProjectSettings, JSON-encoded (D-02). */
  settings: text('settings', { mode: 'json' }).notNull(),
  createdAt: integer('created_at').notNull(),
  lastActiveAt: integer('last_active_at').notNull(),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  semanticTestId: text('semantic_test_id').notNull(),
  branch: text('branch').notNull(),
  status: text('status').notNull(),
  /** FailureClassification, JSON-encoded — null until classified (D-03). */
  classification: text('classification', { mode: 'json' }),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
});

export const runSteps = sqliteTable('run_steps', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  stepIndex: integer('step_index').notNull(),
  label: text('label').notNull(),
  status: text('status').notNull(),
  durationMs: integer('duration_ms'),
  /** Evidence reference paths, JSON-encoded. */
  evidenceRefs: text('evidence_refs', { mode: 'json' }),
});

export const indexCache = sqliteTable('index_cache', {
  workspaceId: text('workspace_id').primaryKey(),
  version: integer('version').notNull(),
  /** Serialized RepositoryIndex. */
  payload: text('payload', { mode: 'json' }).notNull(),
  contentHash: text('content_hash').notNull(),
  indexedAt: integer('indexed_at').notNull(),
});

export const apiUsage = sqliteTable('api_usage', {
  id: text('id').primaryKey(),
  day: text('day').notNull(),
  operation: text('operation').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  model: text('model').notNull(),
});

/** Idempotent bootstrap DDL, executed on every open (MVP — replaced by a migration runner later). */
export const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    repository TEXT NOT NULL,
    framework TEXT NOT NULL,
    stats TEXT NOT NULL,
    settings TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    semantic_test_id TEXT NOT NULL,
    branch TEXT NOT NULL,
    status TEXT NOT NULL,
    classification TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS run_steps (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER,
    evidence_refs TEXT
  );
  CREATE TABLE IF NOT EXISTS index_cache (
    workspace_id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    payload TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    indexed_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS api_usage (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    operation TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    model TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_runs_workspace ON runs (workspace_id);
  CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps (run_id);
` as const;
