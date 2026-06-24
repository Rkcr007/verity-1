import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RepositoryIndexSnapshot } from '@verity/adapter-contract';
import type { SemanticStep, StepLocatorRef } from '@verity/semantic-model';
import type { TranspileFile } from '@verity/adapter-contract';

/**
 * Append missing locators to existing page object files (M3 E3-S2 T3).
 */
export function patchPageObjects(
  repoRoot: string,
  steps: readonly SemanticStep[],
  index: RepositoryIndexSnapshot,
): readonly TranspileFile[] {
  if (!repoRoot.trim()) return [];
  const patches = new Map<string, string[]>();

  for (const step of steps) {
    const pageName = resolvePageName(step, index);
    if (!pageName) continue;

    const pageObject = index.pageObjects.find(
      (po) => po.className === pageName || po.name === pageName,
    );
    if (!pageObject?.filePath) continue;

    for (const locator of step.locators) {
      if (!locator.invented) continue;
      if (locatorExistsInIndex(locator, index, pageName)) continue;

      const absPath = join(repoRoot, pageObject.filePath);
      if (!existsSync(absPath)) continue;

      const methodName = toMethodName(locator.ref);
      const body = pageObjectLocatorMethod(locator);

      const existing = patches.get(pageObject.filePath) ?? [];
      if (existing.some((line) => line.includes(methodName))) continue;
      existing.push(body);
      patches.set(pageObject.filePath, existing);
    }
  }

  const files: TranspileFile[] = [];
  for (const [relPath, additions] of patches) {
    const absPath = join(repoRoot, relPath);
    const original = readFileSync(absPath, 'utf8');
    const content = appendBeforeClassClose(original, additions.join('\n\n'));
    files.push({ path: relPath, content, type: 'modify' });
  }

  return files;
}

function resolvePageName(step: SemanticStep, index: RepositoryIndexSnapshot): string | null {
  const fromContext = step.context.match(/([A-Z][A-Za-z0-9]*Page)/);
  if (fromContext?.[1]) return fromContext[1];

  const pageObject = index.pageObjects.find((po) =>
    step.intent.toLowerCase().includes(po.name.toLowerCase()),
  );
  return pageObject?.className ?? null;
}

function locatorExistsInIndex(
  locator: StepLocatorRef,
  index: RepositoryIndexSnapshot,
  pageName: string,
): boolean {
  return index.locators.some(
    (l) =>
      l.pageName === pageName &&
      l.strategy === locator.strategy &&
      l.selector === locator.value,
  );
}

function toMethodName(ref: string): string {
  return ref
    .split('-')
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function pageObjectLocatorMethod(locator: StepLocatorRef): string {
  const method = toMethodName(locator.ref);
  switch (locator.strategy) {
    case 'role':
      return `  public Locator ${method}(Page page) {
    return page.getByRole(AriaRole.${toAriaRole(locator.value)});
  }`;
    case 'placeholder':
      return `  public Locator ${method}(Page page) {
    return page.getByPlaceholder("${escapeJava(locator.value)}");
  }`;
    case 'text':
      return `  public Locator ${method}(Page page) {
    return page.getByText("${escapeJava(locator.value)}");
  }`;
    default:
      return `  public Locator ${method}(Page page) {
    return page.locator("${escapeJava(locator.value)}");
  }`;
  }
}

function toAriaRole(value: string): string {
  const normalized = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : 'BUTTON';
}

function escapeJava(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function appendBeforeClassClose(source: string, block: string): string {
  const lastBrace = source.lastIndexOf('}');
  if (lastBrace < 0) return `${source}\n\n${block}\n`;
  return `${source.slice(0, lastBrace)}\n\n${block}\n${source.slice(lastBrace)}`;
}
