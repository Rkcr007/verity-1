import type { SemanticTestRunStatus } from '@verity/core/ipc';

/** Status dot color for the workspace left panel (E2-S3). */
export function semanticStatusColor(status: SemanticTestRunStatus): string {
  switch (status) {
    case 'pass':
      return 'var(--ok)';
    case 'fail':
      return 'var(--err)';
    default:
      return 'var(--mod)';
  }
}

/** Human-readable status label. Pass/fail derived from last run in M5. */
export function semanticStatusLabel(status: SemanticTestRunStatus): string {
  switch (status) {
    case 'pass':
      return 'passed';
    case 'fail':
      return 'failed';
    default:
      return 'draft';
  }
}
