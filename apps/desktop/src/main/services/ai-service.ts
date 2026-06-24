import { ProposalId, SessionId, type ProposalId as ProposalIdType } from '@verity/core';
import type { AiGenerateRequest, AiGenerateResponse, SemanticTestDto } from '@verity/core/ipc';
import { assembleGenerationContext, generateStepsFromPrompt } from '@verity/ai-orchestration';
import { createSemanticTest } from '@verity/semantic-model';
import { toSemanticTestDto } from '../mappers/semantic-mapper.js';
import type { DomainEventBus } from '../event-bus.js';
import type { IIntelligenceService } from './intelligence-service.js';
import type { IProjectService } from './project-service.js';
import type { ISemanticModelService } from './semantic-model-service.js';

/**
 * AiService (M4) — streaming step generation with Claude + rules fallback.
 */
export interface IAiService {
  generate(request: AiGenerateRequest): AiGenerateResponse;
}

export class AiService implements IAiService {
  constructor(
    private readonly projects: IProjectService,
    private readonly semantic: ISemanticModelService,
    private readonly intelligence: IIntelligenceService,
    private readonly bus: DomainEventBus,
  ) {}

  generate(request: AiGenerateRequest): AiGenerateResponse {
    const sessionId = SessionId();
    const proposalId = ProposalId();
    const project = this.projects.get(request.projectId);

    this.bus.emit(
      'ai.generation.started',
      {
        projectId: request.projectId,
        sessionId,
        proposalId,
        prompt: request.prompt,
      },
      request.projectId,
    );

    void this.runGeneration(request, sessionId, proposalId, project.framework.adapterId);

    return { sessionId, proposalId };
  }

  private async runGeneration(
    request: AiGenerateRequest,
    sessionId: string,
    proposalId: ProposalIdType,
    adapterId: ReturnType<IProjectService['get']>['framework']['adapterId'],
  ): Promise<void> {
    try {
      this.emitReasoning(request.projectId, sessionId, 'ai', 'Reading repository context…');

      const index = this.intelligence.getIndex(request.projectId);
      const existing = this.semantic.list(request.projectId).map((t) => t.name);
      const context = assembleGenerationContext(request.prompt, index, existing);

      if (context.pages.length > 0) {
        this.emitReasoning(
          request.projectId,
          sessionId,
          'ai',
          `Found ${context.pages.length} page(s) and ${context.flows.length} flow(s) in index.`,
        );
      }

      this.emitReasoning(request.projectId, sessionId, 'ai', 'Generating semantic test steps…');

      const generated = await generateStepsFromPrompt(context, adapterId);
      this.emitReasoning(
        request.projectId,
        sessionId,
        'ai',
        generated.source === 'llm'
          ? 'Steps generated via Claude API.'
          : 'Steps generated via rules (set ANTHROPIC_API_KEY for LLM).',
      );

      for (let i = 0; i < generated.steps.length; i++) {
        const item = generated.steps[i];
        if (!item) continue;

        this.emitReasoning(request.projectId, sessionId, 'step', item.reasoning);

        this.bus.emit(
          'ai.generation.step',
          {
            projectId: request.projectId,
            sessionId,
            proposalId,
            step: item.step,
            index: i,
          },
          request.projectId,
        );

        await delay(280);
      }

      const test = createSemanticTest({
        id: generated.slug,
        name: generated.testName,
        adapter: adapterId,
        promptVersion: generated.source === 'llm' ? 'claude-step-gen@1' : 'rules-step-gen@1',
        steps: generated.steps.map((s) => s.step),
      });

      const dto: SemanticTestDto = toSemanticTestDto(test);
      const proposal = this.semantic.createProposalWithId(
        request.projectId,
        request.prompt,
        dto,
        proposalId,
      );

      this.bus.emit(
        'ai.generation.completed',
        {
          projectId: request.projectId,
          sessionId,
          proposal,
        },
        request.projectId,
      );
    } catch (error) {
      this.emitReasoning(
        request.projectId,
        sessionId,
        'err',
        error instanceof Error ? error.message : 'Generation failed',
      );
    }
  }

  private emitReasoning(
    projectId: ReturnType<IProjectService['get']>['id'],
    sessionId: string,
    type: 'ai' | 'step' | 'ok' | 'err',
    message: string,
  ): void {
    this.bus.emit(
      'ai.reasoning.entry',
      {
        projectId,
        sessionId,
        entry: { type, message, timestamp: Date.now() },
      },
      projectId,
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
