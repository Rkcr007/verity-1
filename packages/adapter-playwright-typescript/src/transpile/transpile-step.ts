import type { SemanticStep } from '@verity/semantic-model';

/**
 * Project a single semantic step into Playwright Test statements (M1.7).
 */
export function transpileStep(step: SemanticStep, indent = '  '): readonly string[] {
  const lines: string[] = [];
  lines.push(`${indent}// Step ${step.id}: ${step.intent}`);

  const locator = step.locators[0];
  const locatorExpr = locator ? locatorExpression(locator.strategy, locator.value) : 'page.locator("body")';

  switch (normalizeAction(step.action)) {
    case 'navigate':
      lines.push(`${indent}await page.goto('${extractUrl(step)}');`);
      break;
    case 'click':
      lines.push(`${indent}await ${locatorExpr}.click();`);
      break;
    case 'fill':
    case 'type':
      lines.push(`${indent}await ${locatorExpr}.fill('${escapeQuote(extractInputValue(step))}');`);
      break;
    case 'assert':
    case 'verify':
      lines.push(`${indent}await expect(${locatorExpr}).toBeVisible();`);
      break;
    default:
      lines.push(`${indent}// action: ${step.action}`);
      lines.push(`${indent}await ${locatorExpr}.click();`);
  }

  return lines;
}

function normalizeAction(action: string): string {
  return action.trim().toLowerCase().split(/\s+/)[0] ?? action;
}

function extractUrl(step: SemanticStep): string {
  const fromContext = step.context.match(/https?:\/\/[^\s"']+/);
  if (fromContext?.[0]) return fromContext[0];
  return 'https://example.com';
}

function extractInputValue(step: SemanticStep): string {
  const quoted = step.expected.match(/"([^"]+)"/);
  if (quoted?.[1]) return quoted[1];
  return step.expected.slice(0, 120);
}

function escapeQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function locatorExpression(strategy: string, value: string): string {
  switch (strategy) {
    case 'role':
      return `page.getByRole('button', { name: '${escapeQuote(value)}' })`;
    case 'placeholder':
      return `page.getByPlaceholder('${escapeQuote(value)}')`;
    case 'text':
      return `page.getByText('${escapeQuote(value)}')`;
    case 'label':
      return `page.getByLabel('${escapeQuote(value)}')`;
    case 'test-id':
      return `page.getByTestId('${escapeQuote(value)}')`;
    default:
      return `page.locator('${escapeQuote(value)}')`;
  }
}
