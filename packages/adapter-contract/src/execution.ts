/**
 * Browser and runtime options for local test execution.
 */
export interface ExecutionConfig {
  readonly browser: 'chromium' | 'firefox' | 'webkit';
  readonly headless: boolean;
  readonly parallelWorkers: number;
  readonly captureEvidence: boolean;
  /** When aborted, the adapter should terminate the subprocess. */
  readonly abortSignal?: AbortSignal;
}

export type ExecutionEventType =
  | 'step.started'
  | 'step.passed'
  | 'step.failed'
  | 'run.completed';

export interface HarEntry {
  readonly method: string;
  readonly url: string;
  readonly status: number;
  readonly durationMs: number;
}

export interface ExecutionEvidence {
  readonly screenshot?: Buffer;
  readonly networkLog?: readonly HarEntry[];
}

export interface ExecutionError {
  readonly message: string;
  readonly stack?: string;
}

export type ExecutionRunOutcome = 'passed' | 'failed' | 'cancelled';

/**
 * Streaming execution event from an adapter runner (architecture §9.1, §11).
 */
export interface ExecutionEvent {
  readonly type: ExecutionEventType;
  readonly stepId: number;
  readonly timestamp: number;
  readonly duration?: number;
  readonly evidence?: ExecutionEvidence;
  readonly error?: ExecutionError;
  /** Present on `run.completed`. */
  readonly outcome?: ExecutionRunOutcome;
}

export function stepStarted(stepId: number, timestamp: number = Date.now()): ExecutionEvent {
  return { type: 'step.started', stepId, timestamp };
}

export function stepPassed(
  stepId: number,
  duration: number,
  timestamp: number = Date.now(),
  evidence?: ExecutionEvidence,
): ExecutionEvent {
  const event: ExecutionEvent = {
    type: 'step.passed',
    stepId,
    timestamp,
    duration,
  };
  if (evidence !== undefined) {
    return { ...event, evidence };
  }
  return event;
}

export function stepFailed(
  stepId: number,
  error: ExecutionError,
  duration?: number,
  timestamp: number = Date.now(),
  evidence?: ExecutionEvidence,
): ExecutionEvent {
  const event: ExecutionEvent = {
    type: 'step.failed',
    stepId,
    timestamp,
    error,
    ...(duration !== undefined ? { duration } : {}),
  };
  if (evidence !== undefined) {
    return { ...event, evidence };
  }
  return event;
}

export function runCompleted(
  outcome: ExecutionRunOutcome,
  timestamp: number = Date.now(),
): ExecutionEvent {
  return { type: 'run.completed', stepId: 0, timestamp, outcome };
}
