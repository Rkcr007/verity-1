import type { AdapterId, Framework } from '@verity/core';
import { detectBestFramework } from '../registry.js';
import {
  detectSeleniumJavaSignals,
  inspectFolder,
  type FolderEntryKind,
} from '../inspect/folder-inspect.js';

/** Signals extracted from a local repo path for connect/migrate intelligence (M1.7). */
export interface RepoFrameworkSignals {
  readonly path: string;
  readonly entryKind: FolderEntryKind;
  readonly detectedAdapterId: AdapterId | null;
  readonly detectedFramework: Framework | null;
  readonly seleniumDetected: boolean;
  readonly seleniumReasons: readonly string[];
  readonly detectionReasons: readonly string[];
  readonly confidence: number;
}

/**
 * Analyzes a repository folder for framework detection and migration routing.
 */
export function analyzeRepoFrameworkSignals(repoPath: string): RepoFrameworkSignals | null {
  const path = repoPath.trim();
  if (!path) {
    return null;
  }

  const inspection = inspectFolder(path);
  const selenium = detectSeleniumJavaSignals(path);
  const outcome = detectBestFramework(path);

  return {
    path,
    entryKind: inspection.entryKind,
    detectedAdapterId: outcome.detection.detected ? outcome.framework.adapterId : null,
    detectedFramework: outcome.detection.detected ? outcome.framework : null,
    seleniumDetected: selenium.detected,
    seleniumReasons: selenium.reasons,
    detectionReasons: outcome.detection.reasons,
    confidence: outcome.detection.confidence,
  };
}
