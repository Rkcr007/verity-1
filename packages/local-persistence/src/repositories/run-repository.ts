import { and, desc, eq } from 'drizzle-orm';
import type { WorkspaceId } from '@verity/core';
import type { RunId, RunStepId } from '@verity/core';
import type {
  ExecutionOutcome,
  ExecutionRunDto,
  FailureClassificationType,
  RunStepDto,
  RunStepStatus,
} from '@verity/core/ipc';
import type { VerityDatabase } from '../database.js';
import { runSteps, runs } from '../schema.js';

export interface RunRecord {
  readonly id: RunId;
  readonly workspaceId: WorkspaceId;
  readonly semanticTestId: string;
  readonly semanticTestName: string;
  readonly branch: string;
  readonly status: ExecutionOutcome | 'running';
  readonly classification: {
    readonly type: FailureClassificationType;
    readonly confidence: number;
    readonly summary: string;
  } | null;
  readonly startedAt: number;
  readonly completedAt: number | null;
}

export interface RunStepRecord {
  readonly id: RunStepId;
  readonly runId: RunId;
  readonly stepIndex: number;
  readonly label: string;
  readonly status: RunStepStatus;
  readonly durationMs: number | null;
}

export interface IRunRepository {
  insertRun(run: RunRecord): void;
  updateRunStatus(
    runId: RunId,
    status: ExecutionOutcome | 'running',
    completedAt?: number,
    classification?: RunRecord['classification'],
  ): void;
  insertStep(step: RunStepRecord): void;
  updateStep(
    runId: RunId,
    stepIndex: number,
    status: RunStepStatus,
    durationMs?: number,
  ): void;
  findById(runId: RunId): ExecutionRunDto | null;
  listByWorkspace(workspaceId: WorkspaceId): readonly ExecutionRunDto[];
  findLatestForTest(workspaceId: WorkspaceId, semanticTestId: string): ExecutionRunDto | null;
}

export class RunRepository implements IRunRepository {
  constructor(private readonly db: VerityDatabase) {}

  insertRun(run: RunRecord): void {
    this.db
      .insert(runs)
      .values({
        id: run.id,
        workspaceId: run.workspaceId,
        semanticTestId: run.semanticTestId,
        semanticTestName: run.semanticTestName,
        branch: run.branch,
        status: run.status,
        classification: run.classification,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      })
      .run();
  }

  updateRunStatus(
    runId: RunId,
    status: ExecutionOutcome | 'running',
    completedAt?: number,
    classification?: RunRecord['classification'],
  ): void {
    this.db
      .update(runs)
      .set({
        status,
        ...(completedAt !== undefined ? { completedAt } : {}),
        ...(classification !== undefined ? { classification } : {}),
      })
      .where(eq(runs.id, runId))
      .run();
  }

  insertStep(step: RunStepRecord): void {
    this.db
      .insert(runSteps)
      .values({
        id: step.id,
        runId: step.runId,
        stepIndex: step.stepIndex,
        label: step.label,
        status: step.status,
        durationMs: step.durationMs,
        evidenceRefs: null,
      })
      .run();
  }

  updateStep(runId: RunId, stepIndex: number, status: RunStepStatus, durationMs?: number): void {
    this.db
      .update(runSteps)
      .set({
        status,
        ...(durationMs !== undefined ? { durationMs } : {}),
      })
      .where(and(eq(runSteps.runId, runId), eq(runSteps.stepIndex, stepIndex)))
      .run();
  }

  findById(runId: RunId): ExecutionRunDto | null {
    const row = this.db.select().from(runs).where(eq(runs.id, runId)).get();
    if (!row) return null;
    return this.toDto(row);
  }

  listByWorkspace(workspaceId: WorkspaceId): readonly ExecutionRunDto[] {
    const rows = this.db
      .select()
      .from(runs)
      .where(eq(runs.workspaceId, workspaceId))
      .orderBy(desc(runs.startedAt))
      .all();
    return rows.map((row) => this.toDto(row));
  }

  findLatestForTest(workspaceId: WorkspaceId, semanticTestId: string): ExecutionRunDto | null {
    const row = this.db
      .select()
      .from(runs)
      .where(and(eq(runs.workspaceId, workspaceId), eq(runs.semanticTestId, semanticTestId)))
      .orderBy(desc(runs.startedAt))
      .get();
    if (!row) return null;
    return this.toDto(row);
  }

  private toDto(row: typeof runs.$inferSelect): ExecutionRunDto {
    const stepRows = this.db
      .select()
      .from(runSteps)
      .where(eq(runSteps.runId, row.id))
      .orderBy(runSteps.stepIndex)
      .all();

    const steps: RunStepDto[] = stepRows.map((s) => ({
      id: s.id,
      stepIndex: s.stepIndex,
      label: s.label,
      status: s.status as RunStepStatus,
      ...(s.durationMs != null ? { durationMs: s.durationMs } : {}),
    }));

    const classification = row.classification as RunRecord['classification'];

    return {
      id: row.id as RunId,
      projectId: row.workspaceId as WorkspaceId,
      semanticTestSlug: row.semanticTestId,
      semanticTestName: row.semanticTestName || row.semanticTestId,
      branch: row.branch,
      status: row.status as ExecutionRunDto['status'],
      startedAt: row.startedAt,
      ...(row.completedAt != null ? { completedAt: row.completedAt } : {}),
      steps,
      ...(classification
        ? {
            classification: {
              type: classification.type,
              confidence: classification.confidence,
              summary: classification.summary,
            },
          }
        : {}),
    };
  }
}
