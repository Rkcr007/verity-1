import type { AdapterId } from '@verity/core';
import type { SemanticStepDto } from '@verity/core/ipc';
import type { GenerationContext } from './context-assembler.js';

export interface GeneratedStep {
  readonly step: SemanticStepDto;
  readonly reasoning: string;
}

export interface StepGenerationResult {
  readonly steps: readonly GeneratedStep[];
  readonly testName: string;
  readonly slug: string;
  readonly source: 'llm' | 'rules';
}

export interface StepGenerationOptions {
  readonly apiKey?: string;
  readonly model?: string;
}

/**
 * Generate semantic test steps from a prompt (M4 E4-S2).
 * Uses Claude when ANTHROPIC_API_KEY is set; otherwise rule-based fallback.
 */
export async function generateStepsFromPrompt(
  context: GenerationContext,
  adapterId: AdapterId,
  options: StepGenerationOptions = {},
): Promise<StepGenerationResult> {
  const apiKey = options.apiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim();
  if (apiKey) {
    const llm = await generateWithLlm(context, adapterId, apiKey, options.model);
    if (llm) return llm;
  }
  return generateWithRules(context, adapterId);
}

async function generateWithLlm(
  context: GenerationContext,
  _adapterId: AdapterId,
  apiKey: string,
  model?: string,
): Promise<StepGenerationResult | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model ?? 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: buildLlmPrompt(context) }],
      }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
    const parsed = parseStepsJson(text);
    if (!parsed || parsed.steps.length === 0) return null;

    const slug = slugFromPrompt(context.prompt);
    return {
      steps: parsed.steps.map((s, i) => ({
        step: {
          id: i + 1,
          intent: s.intent,
          action: s.action,
          context: s.context,
          expected: s.expected,
          confidence: s.confidence,
          locators: s.locators ?? [],
        },
        reasoning: s.reasoning ?? `Step ${i + 1}: ${s.intent}`,
      })),
      testName: parsed.name ?? titleFromPrompt(context.prompt),
      slug,
      source: 'llm',
    };
  } catch {
    return null;
  }
}

function generateWithRules(context: GenerationContext, adapterId: AdapterId): StepGenerationResult {
  const slug = slugFromPrompt(context.prompt);
  const page = context.pages[0]?.name ?? 'application';
  const flow = context.flows[0]?.name ?? context.prompt;

  const steps: GeneratedStep[] = [
    {
      step: {
        id: 1,
        intent: `Open ${page}`,
        action: 'navigate',
        context: context.prompt,
        expected: `${page} loads successfully`,
        confidence: 0.82,
        locators: [],
      },
      reasoning: `Reading repository — detected page "${page}" from index.`,
    },
    {
      step: {
        id: 2,
        intent: `Execute flow: ${flow}`,
        action: 'interact',
        context: context.prompt,
        expected: 'Primary user action completes',
        confidence: 0.78,
        locators: [],
      },
      reasoning: `Matched business flow "${flow}" to prompt intent.`,
    },
    {
      step: {
        id: 3,
        intent: 'Verify outcome',
        action: 'assert',
        context: context.prompt,
        expected: 'Expected state is visible and stable',
        confidence: 0.76,
        locators: [],
      },
      reasoning: `Mapped intent to ${adapterId} conventions — Page Object Model.`,
    },
  ];

  return {
    steps,
    testName: titleFromPrompt(context.prompt),
    slug,
    source: 'rules',
  };
}

function buildLlmPrompt(context: GenerationContext): string {
  const pages = context.pages
    .slice(0, 12)
    .map((p) => `- ${p.name}${p.description ? `: ${p.description}` : ''} (${p.locatorCount} locators)`)
    .join('\n');
  const flows = context.flows
    .slice(0, 8)
    .map((f) => `- ${f.name}`)
    .join('\n');

  return `You are Verity, an AI test engineer. Generate semantic test steps for Playwright.

User prompt: ${context.prompt}

Repository pages:
${pages || '- (none indexed yet)'}

Business flows:
${flows || '- (none detected yet)'}

Existing tests: ${context.existingTests.join(', ') || 'none'}

Respond with ONLY valid JSON:
{
  "name": "Human readable test name",
  "steps": [
    {
      "intent": "short intent",
      "action": "navigate|click|fill|assert|interact",
      "context": "details",
      "expected": "expected outcome",
      "confidence": 0.0-1.0,
      "locators": [],
      "reasoning": "why this step"
    }
  ]
}`;
}

interface LlmStepShape {
  intent: string;
  action: string;
  context: string;
  expected: string;
  confidence: number;
  locators?: SemanticStepDto['locators'];
  reasoning?: string;
}

function parseStepsJson(text: string): { name?: string; steps: LlmStepShape[] } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { name?: string; steps?: LlmStepShape[] };
    if (!Array.isArray(parsed.steps)) return null;
    return {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      steps: parsed.steps,
    };
  } catch {
    return null;
  }
}

function slugFromPrompt(prompt: string): string {
  const base = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return base.length > 0 ? `${base}-001` : 'generated-test-001';
}

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length < 1) return 'Generated test';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
