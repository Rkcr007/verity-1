import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { PageObjectId } from '@verity/core';
import type { LocatorDto, PageDto } from '@verity/core/ipc';
import { enrichRepositoryIndex } from '../enrichment/enrich-index.js';
import { buildFileTree } from './file-tree.js';
import { loadIgnorePatterns, shouldIgnorePath } from './gitignore.js';
import {
  analyzeJavaFile,
  flowsFromPageObjects,
  pageDtoFromObject,
  type ExtractedPageObject,
  type JavaFileAnalysis,
} from './java-extractor.js';
import type { RepositoryScanPayload, FileContribution } from './structural-scan.js';

export type FileChangeType = 'created' | 'modified' | 'deleted';

export interface FileChange {
  readonly path: string;
  readonly changeType: FileChangeType;
}

export type { FileContribution };

export interface IncrementalIndexResult {
  readonly payload: RepositoryScanPayload;
  readonly contentHash: string;
}

/**
 * Merge filesystem deltas into an existing repository index (E1-S5).
 */
export function applyIncrementalChanges(
  repoRoot: string,
  current: RepositoryScanPayload,
  changes: readonly FileChange[],
): IncrementalIndexResult {
  const ignore = loadIgnorePatterns(repoRoot);
  const contributions: Record<string, FileContribution> = {
    ...(current.fileContributions ?? {}),
  };

  const locators: LocatorDto[] = [...current.locators];
  const pages: PageDto[] = [...current.pages];
  let nonJavaTests = current.nonJavaTests ?? 0;
  let javaChanged = false;
  let treeChanged = false;

  for (const change of changes) {
    const rel = normalizeRelativePath(change.path, repoRoot);
    if (shouldIgnorePath(rel, ignore)) continue;

    treeChanged = true;
    removeFileData(rel, contributions, locators, pages);

    if (change.changeType === 'deleted') {
      if (rel.endsWith('.java')) javaChanged = true;
      continue;
    }

    const fullPath = join(repoRoot, rel);
    if (!existsSync(fullPath)) continue;

    if (rel.endsWith('.java')) {
      javaChanged = true;
      try {
        const content = readFileSync(fullPath, 'utf8');
        const analysis = analyzeJavaFile(rel, content);
        applyJavaAnalysis(rel, basename(rel), analysis, contributions, locators, pages);
      } catch {
        // unreadable file — contributions already cleared
      }
      continue;
    }

    if (rel.endsWith('.ts') || rel.endsWith('.tsx')) {
      if (rel.includes('test') || rel.includes('spec')) {
        nonJavaTests += 1;
      }
    }
  }

  if (!javaChanged && !treeChanged) {
    return { payload: current, contentHash: hashPayload(current) };
  }

  const pageObjects = pageObjectsFromPages(pages);
  const flows = flowsFromPageObjects(pageObjects).map((f) => ({
    id: f.id,
    name: f.name,
    stepCount: f.stepCount,
    confidence: f.confidence,
  }));

  const stats = {
    tests: sumTests(contributions) + nonJavaTests,
    pages: pages.length,
    pageObjects: pages.length,
    utils: Object.values(contributions).filter((c) => c.isUtil).length,
    flows: flows.length,
  };

  const draft: RepositoryScanPayload = {
    understandingScore: current.understandingScore,
    pages,
    flows,
    locators,
    conventions: current.conventions,
    fileTree: treeChanged ? buildFileTree(repoRoot) : current.fileTree,
    stats,
    fileContributions: contributions,
    nonJavaTests,
  };

  const payload = enrichRepositoryIndex(draft, { repoRoot });
  return { payload, contentHash: hashPayload(payload) };
}

function normalizeRelativePath(path: string, repoRoot: string): string {
  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith(repoRoot.replace(/\\/g, '/'))) {
    const prefix = repoRoot.replace(/\\/g, '/');
    const rel = normalized.slice(prefix.length).replace(/^\//, '');
    return rel;
  }
  return normalized.replace(/^\.\//, '');
}

function removeFileData(
  rel: string,
  contributions: Record<string, FileContribution>,
  locators: LocatorDto[],
  pages: PageDto[],
): void {
  delete contributions[rel];

  for (let i = locators.length - 1; i >= 0; i -= 1) {
    if (locators[i]?.sourcePath === rel) locators.splice(i, 1);
  }

  for (let i = pages.length - 1; i >= 0; i -= 1) {
    if (pages[i]?.sourcePath === rel) pages.splice(i, 1);
  }
}

function applyJavaAnalysis(
  rel: string,
  name: string,
  analysis: JavaFileAnalysis,
  contributions: Record<string, FileContribution>,
  locators: LocatorDto[],
  pages: PageDto[],
): void {
  contributions[rel] = {
    tests: analysis.tests.length,
    ...(analysis.pageObject ? { pageObjectId: analysis.pageObject.className } : {}),
    isUtil: rel.includes('util') || name.toLowerCase().includes('helper'),
  };

  if (analysis.pageObject) {
    const count = analysis.locators.filter(
      (l) => l.pageName === analysis.pageObject?.className,
    ).length;
    pages.push(pageDtoFromObject(analysis.pageObject, count));
  }

  for (const locator of analysis.locators) {
    locators.push({
      id: locator.id,
      name: locator.name,
      strategy: locator.strategy,
      selector: locator.selector,
      pageName: locator.pageName ?? 'Unknown',
      confidence: 0.85,
      sourcePath: locator.filePath,
    });
  }
}

function pageObjectsFromPages(pages: readonly PageDto[]): ExtractedPageObject[] {
  return pages
    .filter((p): p is PageDto & { sourcePath: string } => Boolean(p.sourcePath))
    .map((p) => ({
      id: PageObjectId(p.id),
      name: p.name,
      className: p.id,
      filePath: p.sourcePath,
    }));
}

function sumTests(contributions: Record<string, FileContribution>): number {
  return Object.values(contributions).reduce((sum, c) => sum + c.tests, 0);
}

function hashPayload(payload: RepositoryScanPayload): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        stats: payload.stats,
        locatorCount: payload.locators.length,
        pageCount: payload.pages.length,
        score: payload.understandingScore,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}
