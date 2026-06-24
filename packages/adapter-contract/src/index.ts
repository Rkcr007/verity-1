export type {
  PageSnapshot,
  PageObjectSnapshot,
  LocatorSnapshot,
  BusinessFlowSnapshot,
  ConventionSnapshot,
  RepositoryIndexSnapshot,
} from './repository-index-snapshot.js';
export { emptyRepositoryIndexSnapshot } from './repository-index-snapshot.js';

export type { DetectionResult } from './detection.js';
export { detectedFramework, notDetected, pickBestDetection } from './detection.js';

export type { TranspileFileType, TranspileFile, TranspileResult } from './transpile.js';
export { transpileResult } from './transpile.js';

export type {
  ExecutionConfig,
  ExecutionEventType,
  HarEntry,
  ExecutionEvidence,
  ExecutionError,
  ExecutionRunOutcome,
  ExecutionEvent,
} from './execution.js';
export { stepStarted, stepPassed, stepFailed, runCompleted } from './execution.js';

export type { PrerequisiteCheck, PrerequisiteReport } from './prerequisites.js';
export { prerequisiteReport, satisfiedCheck, failedCheck } from './prerequisites.js';

export type { TestAdapter } from './test-adapter.js';
export { isTestAdapter } from './test-adapter.js';
