import { SessionId } from '@verity/core';
import type { AiGenerateRequest, AiGenerateResponse, SemanticTestDto } from '@verity/core/ipc';
import { createSemanticTest } from '@verity/semantic-model';
import { toSemanticTestDto } from '../mappers/semantic-mapper.js';
import type { IProjectService } from './project-service.js';
import type { ISemanticModelService } from './semantic-model-service.js';

/**
 * AiService (M4 stub) — template-based generation for backend E2E until Claude integration ships.
 */
export interface IAiService {
  generate(request: AiGenerateRequest): AiGenerateResponse;
}

export class AiService implements IAiService {
  constructor(
    private readonly projects: IProjectService,
    private readonly semantic: ISemanticModelService,
  ) {}

  generate(request: AiGenerateRequest): AiGenerateResponse {
    const project = this.projects.get(request.projectId);
    const slug = slugFromPrompt(request.prompt);
    const test = createSemanticTest({
      id: slug,
      name: titleFromPrompt(request.prompt),
      adapter: project.framework.adapterId,
      promptVersion: 'e2e-stub@1.0.0',
      steps: [
        {
          id: 1,
          intent: 'Open application',
          action: 'navigate',
          context: request.prompt,
          expected: 'Application loads',
          confidence: 0.8,
          locators: [],
        },
        {
          id: 2,
          intent: 'Verify primary flow',
          action: 'assert',
          context: request.prompt,
          expected: 'Expected outcome is visible',
          confidence: 0.75,
          locators: [],
        },
      ],
    });

    const dto: SemanticTestDto = toSemanticTestDto(test);
    const proposal = this.semantic.createProposal(request.projectId, request.prompt, dto);
    const sessionId = SessionId();

    return { sessionId, proposalId: proposal.id };
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
