import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { RunId, RunStepId, ValidationError, type WorkspaceId } from '@verity/core';
import type {
  ExecutionCancelRequest,
  ExecutionGetRequest,
  ExecutionListRequest,
  ExecutionRunDto,
  ExecutionRunRequest,
  FailureClassificationType,
} from '@verity/core/ipc';
import type { ExecutionConfig, ExecutionEvent } from '@verity/adapter-contract';
import type { IRunRepository } from '@verity/local-persistence';
import { fromSemanticTestDto } from '../mappers/semantic-mapper.js';
import type { DomainEventBus } from '../event-bus.js';
import type { IAdapterRegistryService } from './adapter-registry-service.js';
import type { IProjectService } from './project-service.js';
import type { ISemanticModelService } from './semantic-model-service.js';

interface ActiveRun {
  readonly runId: RunId;
  readonly projectId: WorkspaceId;
  readonly abort: AbortController;
}

/**
 * ExecutionService (M5) — orchestrates adapter runs, persistence, and IPC events.
 */
export interface IExecutionService {
  run(request: ExecutionRunRequest): RunId;
  cancel(request: ExecutionCancelRequest): void;
  get(request: ExecutionGetRequest): ExecutionRunDto;
  list(request: ExecutionListRequest): readonly ExecutionRunDto[];
}

export class ExecutionService implements IExecutionService {
  private readonly active = new Map<RunId, ActiveRun>();

  constructor(
    private readonly projects: IProjectService,
    private readonly semantic: ISemanticModelService,
    private readonly adapters: IAdapterRegistryService,
    private readonly runs: IRunRepository,
    private readonly bus: DomainEventBus,
  ) {}

  run(request: ExecutionRunRequest): RunId {
    const project = this.projects.get(request.projectId);
    if (!project.repository.path) {
      throw new ValidationError('Connect a repository before running tests.');
    }

    const testDto = this.semantic.get(request.projectId, request.semanticTestSlug);
    const prereq = this.adapters.checkPrerequisites(request.projectId);
    if (!prereq.ready) {
      throw new ValidationError('Prerequisites not satisfied. Open Settings to install toolchain.');
    }

    this.syncTestArtifacts(request.projectId, testDto);

    const runId = RunId();
    const abort = new AbortController();
    this.active.set(runId, { runId, projectId: request.projectId, abort });

    const semanticTest = fromSemanticTestDto(testDto);
    const branch = project.repository.defaultBranch ?? 'main';
    const startedAt = Date.now();

    this.runs.insertRun({
      id: runId,
      workspaceId: request.projectId,
      semanticTestId: testDto.id,
      semanticTestName: testDto.name,
      branch,
      status: 'running',
      classification: null,
      startedAt,
      completedAt: null,
    });

    for (const step of testDto.steps) {
      this.runs.insertStep({
        id: RunStepId(),
        runId,
        stepIndex: step.id,
        label: step.intent,
        status: 'pending',
        durationMs: null,
      });
    }

    this.bus.emit(
      'execution.started',
      { runId, projectId: request.projectId, semanticTestSlug: testDto.id },
      request.projectId,
    );

    void this.executeRun({
      runId,
      projectId: request.projectId,
      repoRoot: project.repository.path,
      testDto,
      semanticTest,
      abortSignal: abort.signal,
      headless: request.headless ?? true,
      startedAt,
    });

    return runId;
  }

  cancel(request: ExecutionCancelRequest): void {
    const active = this.active.get(request.runId);
    if (!active) return;
    active.abort.abort();
  }

  get(request: ExecutionGetRequest): ExecutionRunDto {
    const run = this.runs.findById(request.runId);
    if (!run) {
      throw new ValidationError('Run not found.');
    }
    return run;
  }

  list(request: ExecutionListRequest): readonly ExecutionRunDto[] {
    return this.runs.listByWorkspace(request.projectId);
  }

  private syncTestArtifacts(projectId: WorkspaceId, testDto: ReturnType<ISemanticModelService['get']>): void {
    const preview = this.adapters.transpilePreview(projectId, testDto);
    const project = this.projects.get(projectId);
    const repoRoot = project.repository.path ?? '';
    for (const file of preview.files) {
      const abs = join(repoRoot, file.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, file.content, 'utf8');
    }
  }

  private async executeRun(ctx: {
    runId: RunId;
    projectId: WorkspaceId;
    repoRoot: string;
    testDto: ReturnType<ISemanticModelService['get']>;
    semanticTest: ReturnType<typeof fromSemanticTestDto>;
    abortSignal: AbortSignal;
    headless: boolean;
    startedAt: number;
  }): Promise<void> {
    const adapterId = this.adapters.getActiveAdapterId(ctx.projectId);
    const adapter = this.adapters.resolveAdapter(adapterId);

    const config: ExecutionConfig = {
      browser: 'chromium',
      headless: ctx.headless,
      parallelWorkers: 1,
      captureEvidence: false,
      abortSignal: ctx.abortSignal,
    };

    let outcome: 'passed' | 'failed' | 'cancelled' = 'failed';

    try {
      const events = await adapter.run(ctx.semanticTest, config, ctx.repoRoot);
      for await (const event of events) {
        this.handleEvent(ctx.runId, ctx.projectId, event);
        if (event.type === 'run.completed' && event.outcome) {
          outcome = event.outcome;
        }
      }
    } catch (error) {
      outcome = 'failed';
      this.bus.emit(
        'execution.step.event',
        {
          runId: ctx.runId,
          type: 'step.failed',
          stepId: ctx.testDto.steps[0]?.id ?? 1,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        ctx.projectId,
      );
    } finally {
      this.active.delete(ctx.runId);
      const completedAt = Date.now();
      this.runs.updateRunStatus(ctx.runId, outcome, completedAt);

      this.bus.emit(
        'execution.completed',
        { runId: ctx.runId, projectId: ctx.projectId, outcome },
        ctx.projectId,
      );

      if (outcome === 'failed') {
        const classification = classifyFailure(ctx.testDto.name);
        this.runs.updateRunStatus(ctx.runId, outcome, completedAt, classification);
        this.bus.emit(
          'execution.classified',
          {
            runId: ctx.runId,
            projectId: ctx.projectId,
            type: classification.type,
            confidence: classification.confidence,
            summary: classification.summary,
          },
          ctx.projectId,
        );
      }
    }
  }

  private handleEvent(runId: RunId, projectId: WorkspaceId, event: ExecutionEvent): void {
    if (event.type === 'step.started') {
      this.runs.updateStep(runId, event.stepId, 'running');
    } else if (event.type === 'step.passed') {
      this.runs.updateStep(runId, event.stepId, 'passed', event.duration);
    } else if (event.type === 'step.failed') {
      this.runs.updateStep(runId, event.stepId, 'failed', event.duration);
    }

    if (event.type !== 'run.completed') {
      this.bus.emit(
        'execution.step.event',
        {
          runId,
          type: event.type,
          stepId: event.stepId,
          ...(event.duration !== undefined ? { duration: event.duration } : {}),
          ...(event.error?.message ? { errorMessage: event.error.message } : {}),
        },
        projectId,
      );
    }
  }
}

function classifyFailure(testName: string): {
  type: FailureClassificationType;
  confidence: number;
  summary: string;
} {
  return {
    type: 'test-defect',
    confidence: 0.6,
    summary: `Run failed for "${testName}". Review generated steps and locators.`,
  };
}
