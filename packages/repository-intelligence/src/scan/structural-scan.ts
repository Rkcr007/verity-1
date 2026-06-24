import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type {
  AnalysisProgress,
  BusinessFlowDto,
  ConventionDto,
  FileNode,
  LocatorDto,
  PageDto,
} from '@verity/core/ipc';
import { walkRepository } from '../walk.js';
import { buildFileTree } from './file-tree.js';
import { loadIgnorePatterns, shouldIgnorePath } from './gitignore.js';
import {
  analyzeJavaFile,
  flowsFromPageObjects,
  pageDtoFromObject,
  type ExtractedLocator,
  type ExtractedPageObject,
} from './java-extractor.js';
import { enrichRepositoryIndex } from '../enrichment/enrich-index.js';

export interface IndexScanStats {
  readonly tests: number;
  readonly pages: number;
  readonly pageObjects: number;
  readonly utils: number;
  readonly flows: number;
}

/** Per-file scan metadata used by the incremental indexer (E1-S5). */
export interface FileContribution {
  readonly tests: number;
  readonly pageObjectId?: string;
  readonly isUtil: boolean;
}

export interface RepositoryScanPayload {
  readonly understandingScore: number;
  readonly pages: readonly PageDto[];
  readonly flows: readonly BusinessFlowDto[];
  readonly locators: readonly LocatorDto[];
  readonly conventions: ConventionDto;
  readonly fileTree: readonly FileNode[];
  readonly stats: IndexScanStats;
  readonly fileContributions?: Readonly<Record<string, FileContribution>>;
  readonly nonJavaTests?: number;
}

export interface StructuralScanResult {
  readonly payload: RepositoryScanPayload;
  readonly progress: AnalysisProgress;
  readonly contentHash: string;
}

/**
 * Full structural repository scan — file tree, Java page objects, locators, flows.
 */
export function scanRepositoryStructure(repoRoot: string): StructuralScanResult {
  const ignore = loadIgnorePatterns(repoRoot);
  const pageObjects: ExtractedPageObject[] = [];
  const locators: ExtractedLocator[] = [];
  const fileContributions: Record<string, FileContribution> = {};
  let tests = 0;
  let utils = 0;
  let nonJavaTests = 0;

  walkRepository(repoRoot, (fullPath, name) => {
    const rel = relative(repoRoot, fullPath).replace(/\\/g, '/');
    if (shouldIgnorePath(rel, ignore)) return;

    if (!name.endsWith('.java')) {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        if (rel.includes('test') || rel.includes('spec')) {
          tests += 1;
          nonJavaTests += 1;
        }
      }
      return;
    }

    if (rel.includes('util') || name.toLowerCase().includes('helper')) utils += 1;

    let content: string;
    try {
      content = readFileSync(fullPath, 'utf8');
    } catch {
      return;
    }

    const analysis = analyzeJavaFile(rel, content);
    if (analysis.pageObject) pageObjects.push(analysis.pageObject);
    locators.push(...analysis.locators);
    tests += analysis.tests.length;

    fileContributions[rel] = {
      tests: analysis.tests.length,
      ...(analysis.pageObject ? { pageObjectId: analysis.pageObject.className } : {}),
      isUtil: rel.includes('util') || name.toLowerCase().includes('helper'),
    };
  });

  const pages = pageObjects.map((po) => {
    const count = locators.filter((l) => l.pageName === po.className).length;
    return pageDtoFromObject(po, count);
  });

  const flows = flowsFromPageObjects(pageObjects);
  const fileTree = buildFileTree(repoRoot);

  const stats: IndexScanStats = {
    tests,
    pages: pages.length,
    pageObjects: pageObjects.length,
    utils,
    flows: flows.length,
  };

  const draft: RepositoryScanPayload = {
    understandingScore: 0,
    pages,
    flows: flows.map((f) => ({
      id: f.id,
      name: f.name,
      stepCount: f.stepCount,
      confidence: f.confidence,
    })),
    locators: locators.map((l) => ({
      id: l.id,
      name: l.name,
      strategy: l.strategy,
      selector: l.selector,
      pageName: l.pageName ?? 'Unknown',
      confidence: 0.85,
      sourcePath: l.filePath,
    })),
    conventions: inferConventions(pageObjects, repoRoot),
    fileTree,
    stats,
    fileContributions,
    nonJavaTests,
  };

  const payload = enrichRepositoryIndex(draft, { repoRoot });

  const progress: AnalysisProgress = {
    pages: payload.stats.pages,
    tests: payload.stats.tests,
    pageObjects: payload.stats.pageObjects,
    utils: payload.stats.utils,
    flows: payload.stats.flows,
    understandingScore: payload.understandingScore,
  };

  const contentHash = createHash('sha256')
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

  return { payload, progress, contentHash };
}

function inferConventions(
  pageObjects: readonly ExtractedPageObject[],
  repoRoot: string,
): RepositoryScanPayload['conventions'] {
  void repoRoot;
  const hasPageSuffix = pageObjects.some((p) => p.className.endsWith('Page'));
  return {
    ...(hasPageSuffix ? { pageObjectSuffix: 'Page' } : {}),
    testSourceRoot: 'src/test/java',
    packageRoot: 'src/main/java',
  };
}
