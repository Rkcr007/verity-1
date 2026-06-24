import type { AdapterId, Framework, Project, WorkspaceStatus } from '@verity/core';

const ADAPTER_LABELS: Record<AdapterId, string> = {
  'playwright-java': 'Playwright Java',
  'selenium-java': 'Selenium Java',
  'playwright-typescript': 'Playwright TypeScript',
  'selenium-python': 'Selenium Python',
  cypress: 'Cypress',
};

/**
 * Human-readable adapter name for UI badges.
 */
export function formatAdapterName(adapterId: AdapterId): string {
  return ADAPTER_LABELS[adapterId] ?? adapterId;
}

/**
 * Display label for a Framework value object.
 */
export function formatFramework(framework: Framework): { name: string; version: string } {
  return {
    name: formatAdapterName(framework.adapterId),
    version: framework.version,
  };
}

/**
 * Repo slug shown on project cards (remote slug or folder name).
 */
export function formatRepoSlug(project: Project): string {
  return project.repository.remoteUrl ?? project.repository.slug;
}

/**
 * Workspace status pill label.
 */
export function formatWorkspaceStatus(status: WorkspaceStatus): string {
  const labels: Record<WorkspaceStatus, string> = {
    CREATED: 'new',
    INDEXING: 'indexing',
    READY: 'ready',
    STALE: 'stale',
  };
  return labels[status];
}
