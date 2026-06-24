import type { SemanticTest } from '@verity/semantic-model';
import type { SemanticStepDto, SemanticTestDto } from '@verity/core/ipc';

/** Map domain semantic test → IPC DTO. */
export function toSemanticTestDto(test: SemanticTest): SemanticTestDto {
  return {
    version: test.version,
    id: test.id,
    name: test.name,
    adapter: test.adapter,
    promptVersion: test.promptVersion,
    created: test.created,
    modified: test.modified,
    steps: test.steps.map(toSemanticStepDto),
  };
}

/** Map IPC DTO → domain semantic test. */
export function fromSemanticTestDto(dto: SemanticTestDto): SemanticTest {
  return {
    version: dto.version,
    id: dto.id,
    name: dto.name,
    adapter: dto.adapter,
    promptVersion: dto.promptVersion,
    created: dto.created,
    modified: dto.modified,
    steps: dto.steps.map(fromSemanticStepDto),
  };
}

function toSemanticStepDto(step: SemanticTest['steps'][number]): SemanticStepDto {
  return {
    id: step.id,
    intent: step.intent,
    action: step.action,
    context: step.context,
    expected: step.expected,
    confidence: step.confidence,
    locators: step.locators.map((loc) => ({
      ref: loc.ref,
      strategy: loc.strategy,
      value: loc.value,
      invented: loc.invented,
    })),
  };
}

function fromSemanticStepDto(step: SemanticStepDto): SemanticTest['steps'][number] {
  return {
    id: step.id,
    intent: step.intent,
    action: step.action,
    context: step.context,
    expected: step.expected,
    confidence: step.confidence,
    locators: step.locators.map((loc) => ({
      ref: loc.ref,
      strategy: loc.strategy,
      value: loc.value,
      invented: loc.invented,
    })),
  };
}
