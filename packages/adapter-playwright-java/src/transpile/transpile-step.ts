import type { SemanticStep } from '@verity/semantic-model';

/**
 * Project a single semantic step into Playwright Java statements (M3 E3-S2 T1).
 */
export function transpileStep(step: SemanticStep, indent = '    '): readonly string[] {
  const lines: string[] = [];
  lines.push(`${indent}// Step ${step.id}: ${step.intent}`);

  const locator = step.locators[0];
  const locatorExpr = locator ? locatorExpression(locator.strategy, locator.value) : 'page.locator("body")';

  switch (normalizeAction(step.action)) {
    case 'navigate':
      lines.push(`${indent}page.navigate(${javaString(extractUrl(step))});`);
      break;
    case 'click':
      lines.push(`${indent}${locatorExpr}.click();`);
      break;
    case 'fill':
    case 'type':
      lines.push(`${indent}${locatorExpr}.fill(${javaString(extractInputValue(step))});`);
      break;
    case 'assert':
    case 'verify':
      lines.push(
        `${indent}assertTrue(${locatorExpr}.isVisible(), ${javaString(step.expected)});`,
      );
      break;
    default:
      lines.push(`${indent}// action: ${step.action}`);
      lines.push(`${indent}${locatorExpr}.click();`);
      lines.push(`${indent}// expected: ${step.expected}`);
  }

  return lines;
}

function normalizeAction(action: string): string {
  return action.trim().toLowerCase().split(/\s+/)[0] ?? action;
}

function extractUrl(step: SemanticStep): string {
  const fromContext = step.context.match(/https?:\/\/[^\s"']+/);
  if (fromContext?.[0]) return fromContext[0];
  const fromExpected = step.expected.match(/https?:\/\/[^\s"']+/);
  if (fromExpected?.[0]) return fromExpected[0];
  return 'https://example.com';
}

function extractInputValue(step: SemanticStep): string {
  const quoted = step.expected.match(/"([^"]+)"/);
  if (quoted?.[1]) return quoted[1];
  return step.expected.slice(0, 120);
}

function javaString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function locatorExpression(strategy: string, value: string): string {
  switch (strategy) {
    case 'role':
      return `page.getByRole(AriaRole.${toAriaRole(value)}, new Page.GetByRoleOptions().setName(${javaString(value)}))`;
    case 'placeholder':
      return `page.getByPlaceholder(${javaString(value)})`;
    case 'text':
      return `page.getByText(${javaString(value)})`;
    case 'label':
      return `page.getByLabel(${javaString(value)})`;
    case 'test-id':
      return `page.getByTestId(${javaString(value)})`;
    case 'id':
      return `page.locator("#${escapeCss(value)}")`;
    case 'css':
      return `page.locator(${javaString(value)})`;
    case 'xpath':
      return `page.locator("xpath=${escapeXPath(value)}")`;
    case 'name':
      return `page.locator("[name='${escapeAttr(value)}']")`;
    default:
      return `page.locator(${javaString(value)})`;
  }
}

function toAriaRole(value: string): string {
  const normalized = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : 'BUTTON';
}

function escapeCss(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeXPath(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeAttr(value: string): string {
  return value.replace(/'/g, "\\'");
}
