import type { AdapterId } from '@verity/core';
import type {
  FrameworkCatalogEntry,
  FrameworkRecommendation,
  RecommendFrameworkInput,
  RepoFrameworkSignals,
} from '@verity/repository-intelligence';
import { getCatalogEntry, recommendFramework } from '@verity/repository-intelligence';

export interface LlmRecommendOptions {
  readonly apiKey?: string;
  readonly model?: string;
}

interface LlmResponseShape {
  readonly adapterId: AdapterId;
  readonly reasons: readonly string[];
  readonly confidence: number;
}

/**
 * LLM-powered framework recommendation (M4). Falls back to null when no API key or on error.
 */
export async function recommendFrameworkWithLlm(
  input: RecommendFrameworkInput,
  catalog: readonly FrameworkCatalogEntry[],
  repoSignals: RepoFrameworkSignals | null,
  options: LlmRecommendOptions = {},
): Promise<FrameworkRecommendation | null> {
  const apiKey = options.apiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = options.model ?? 'claude-sonnet-4-20250514';

  try {
    const prompt = buildPrompt(input, catalog, repoSignals);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
    const parsed = parseLlmJson(text);
    if (!parsed) {
      return null;
    }

    const entry = getCatalogEntry(parsed.adapterId);
    if (!entry) {
      return null;
    }

    const scaffoldable = entry.scaffoldSupported ? entry : getCatalogEntry('playwright-java');
    if (!scaffoldable) {
      return null;
    }

    const alternatives = catalog
      .filter((e) => e.adapterId !== scaffoldable.adapterId && e.adapterId !== entry.adapterId)
      .slice(0, 3);

    return {
      recommended: scaffoldable,
      alternatives,
      reasons: [...parsed.reasons, 'Recommended by Verity AI (Claude).'],
      confidence: Math.min(Math.max(parsed.confidence, 0.5), 0.99),
    };
  } catch {
    return null;
  }
}

/**
 * Hybrid recommender — LLM when configured, otherwise rule engine.
 */
export async function recommendFrameworkHybrid(
  input: RecommendFrameworkInput,
  catalog: readonly FrameworkCatalogEntry[],
  repoSignals: RepoFrameworkSignals | null,
  options: LlmRecommendOptions = {},
): Promise<FrameworkRecommendation & { readonly source: 'llm' | 'rules' }> {
  const llm = await recommendFrameworkWithLlm(input, catalog, repoSignals, options);
  if (llm) {
    return { ...llm, source: 'llm' };
  }
  return { ...recommendFramework(input, repoSignals), source: 'rules' };
}

function buildPrompt(
  input: RecommendFrameworkInput,
  catalog: readonly FrameworkCatalogEntry[],
  repoSignals: RepoFrameworkSignals | null,
): string {
  const catalogLines = catalog
    .map(
      (e) =>
        `- ${e.adapterId}: ${e.displayName} (${e.language}, scaffold=${e.scaffoldSupported}, tier=${e.enterpriseTier})`,
    )
    .join('\n');

  const signals = repoSignals
    ? `Repo signals: detected=${repoSignals.detectedAdapterId ?? 'none'}, selenium=${repoSignals.seleniumDetected}, reasons=${[...repoSignals.detectionReasons, ...repoSignals.seleniumReasons].join('; ')}`
    : 'No repo path provided.';

  return `You are an enterprise test automation architect for Verity.

Mode: ${input.mode}
App description: ${input.appDescription ?? 'not provided'}
Language preference: ${input.languagePreference ?? 'infer from context'}
${signals}

Available frameworks:
${catalogLines}

Respond with ONLY valid JSON (no markdown):
{"adapterId":"<id>","reasons":["reason1","reason2"],"confidence":0.85}

Pick the best adapterId for this user's journey. Prefer scaffoldSupported=true for greenfield. For migrate from Selenium Java, target playwright-java. For existing Playwright TS repos, recommend playwright-typescript connect path.`;
}

function parseLlmJson(text: string): LlmResponseShape | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    const raw = JSON.parse(match[0]) as {
      adapterId?: string;
      reasons?: unknown;
      confidence?: unknown;
    };
    if (!raw.adapterId || !Array.isArray(raw.reasons)) {
      return null;
    }
    return {
      adapterId: raw.adapterId as AdapterId,
      reasons: raw.reasons.filter((r): r is string => typeof r === 'string'),
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
    };
  } catch {
    return null;
  }
}
