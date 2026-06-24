import type { RepositoryIndexDto } from '@verity/core/ipc';

export interface GenerationContext {
  readonly prompt: string;
  readonly pages: readonly { name: string; description?: string; locatorCount: number }[];
  readonly flows: readonly { name: string }[];
  readonly existingTests: readonly string[];
}

/**
 * Assemble repository context for step generation (M4 E4-S2 T1).
 */
export function assembleGenerationContext(
  prompt: string,
  index: RepositoryIndexDto,
  existingTestNames: readonly string[],
): GenerationContext {
  return {
    prompt,
    pages: index.pages.map((p) => ({
      name: p.name,
      ...(p.description ? { description: p.description } : {}),
      locatorCount: p.locatorCount,
    })),
    flows: index.flows.map((f) => ({
      name: f.name,
    })),
    existingTests: existingTestNames,
  };
}
