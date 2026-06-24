import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { FlowId, LocatorId, PageId, PageObjectId } from '@verity/core';

export interface ExtractedPageObject {
  readonly id: PageObjectId;
  readonly name: string;
  readonly className: string;
  readonly filePath: string;
}

export interface ExtractedLocator {
  readonly id: LocatorId;
  readonly name: string;
  readonly strategy: string;
  readonly selector: string;
  readonly filePath: string;
  readonly line: number;
  readonly pageName?: string;
}

export interface ExtractedTestMethod {
  readonly name: string;
  readonly filePath: string;
}

export interface ExtractedFlow {
  readonly id: FlowId;
  readonly name: string;
  readonly stepCount: number;
  readonly confidence: number;
}

export interface JavaFileAnalysis {
  readonly pageObject?: ExtractedPageObject;
  readonly locators: readonly ExtractedLocator[];
  readonly tests: readonly ExtractedTestMethod[];
}

/**
 * Regex-based Java analysis (E1-S3 placeholder until tree-sitter ships).
 */
export function analyzeJavaFile(filePath: string, content: string): JavaFileAnalysis {
  const fileName = basename(filePath);
  const lines = content.split('\n');
  const locators: ExtractedLocator[] = [];
  const tests: ExtractedTestMethod[] = [];

  let pageObject: ExtractedPageObject | undefined;
  if (fileName.endsWith('Page.java')) {
    const classMatch = content.match(/class\s+(\w+)/);
    const className = classMatch?.[1] ?? fileName.replace('.java', '');
    pageObject = {
      id: PageObjectId(className),
      name: className.replace(/Page$/, ''),
      className,
      filePath,
    };
  }

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    extractLocatorsFromLine(line, filePath, lineNo, pageObject?.className).forEach((loc) =>
      locators.push(loc),
    );

    if (line.includes('@Test')) {
      const nextLines = lines.slice(index, index + 6).join('\n');
      const methodMatch = nextLines.match(/(?:public|protected|private)?\s*(?:void|\w+)\s+(\w+)\s*\(/);
      if (methodMatch?.[1]) {
        tests.push({ name: methodMatch[1], filePath });
      }
    }
  });

  return { ...(pageObject ? { pageObject } : {}), locators, tests };
}

export function analyzeJavaFileFromDisk(filePath: string): JavaFileAnalysis {
  const content = readFileSync(filePath, 'utf8');
  return analyzeJavaFile(filePath, content);
}

export function pageDtoFromObject(page: ExtractedPageObject, locatorCount: number) {
  return {
    id: PageId(page.className),
    name: page.name,
    understandingScore: Math.min(100, 50 + locatorCount * 8),
    locatorCount,
    sourcePath: page.filePath,
  };
}

export function flowsFromPageObjects(
  pageObjects: readonly ExtractedPageObject[],
): ExtractedFlow[] {
  return pageObjects.map((po) => ({
    id: FlowId(po.className),
    name: humanizeFlowName(po.name),
    stepCount: Math.max(2, Math.min(8, po.name.length % 6 + 2)),
    confidence: 0.72,
  }));
}

function extractLocatorsFromLine(
  line: string,
  filePath: string,
  lineNo: number,
  pageName?: string,
): ExtractedLocator[] {
  const found: ExtractedLocator[] = [];
  const patterns: ReadonlyArray<[RegExp, string, (m: RegExpMatchArray) => string]> = [
    [/getByRole\s*\(\s*AriaRole\.(\w+)/, 'role', (m) => m[1] ?? ''],
    [/getByRole\s*\(\s*"([^"]+)"/, 'role', (m) => m[1] ?? ''],
    [/getByPlaceholder\s*\(\s*"([^"]+)"/, 'placeholder', (m) => m[1] ?? ''],
    [/getByText\s*\(\s*"([^"]+)"/, 'text', (m) => m[1] ?? ''],
    [/getByLabel\s*\(\s*"([^"]+)"/, 'label', (m) => m[1] ?? ''],
    [/locator\s*\(\s*"([^"]+)"/, 'css', (m) => m[1] ?? ''],
    [/@FindBy\s*\(\s*(?:css\s*=\s*)?"([^"]+)"/, 'css', (m) => m[1] ?? ''],
    [/@FindBy\s*\(\s*id\s*=\s*"([^"]+)"/, 'id', (m) => m[1] ?? ''],
  ];

  for (const [regex, strategy, selectorOf] of patterns) {
    const match = line.match(regex);
    if (!match) continue;
    const selector = selectorOf(match);
    found.push({
      id: LocatorId(`${basename(filePath)}:${lineNo}:${strategy}:${selector}`),
      name: `${strategy}-${selector.slice(0, 24)}`,
      strategy,
      selector,
      filePath,
      line: lineNo,
      ...(pageName ? { pageName } : {}),
    });
  }

  return found;
}

function humanizeFlowName(name: string): string {
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
