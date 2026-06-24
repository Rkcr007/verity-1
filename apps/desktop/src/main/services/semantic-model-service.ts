import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  NotFoundError,
  ProposalId,
  ValidationError,
  type WorkspaceId,
} from '@verity/core';
import type {
  SemanticApplyProposalRequest,
  SemanticDiscardProposalRequest,
  SemanticPreviewCodeResponse,
  SemanticProposalDto,
  SemanticTestDto,
  SemanticTestSummaryDto,
} from '@verity/core/ipc';
import {
  parseSemanticTestYaml,
  SEMANTIC_TESTS_DIR,
  semanticTestRelativePath,
  serializeSemanticTestYaml,
  slugFromSemanticTestPath,
  validateSemanticTest,
} from '@verity/semantic-model';
import { fromSemanticTestDto, toSemanticTestDto } from '../mappers/semantic-mapper.js';
import type { IProjectService } from './project-service.js';
import type { DomainEventBus } from '../event-bus.js';

/**
 * SemanticModelService (M2) — filesystem-backed CRUD for `.verity/tests/*.yaml`.
 */
export interface ISemanticModelService {
  list(projectId: WorkspaceId): readonly SemanticTestSummaryDto[];
  get(projectId: WorkspaceId, slug: string): SemanticTestDto;
  write(projectId: WorkspaceId, test: SemanticTestDto): SemanticTestDto;
  delete(projectId: WorkspaceId, slug: string): void;
  previewCode(projectId: WorkspaceId, test: SemanticTestDto): SemanticPreviewCodeResponse;
  applyProposal(request: SemanticApplyProposalRequest): SemanticProposalDto;
  discardProposal(request: SemanticDiscardProposalRequest): void;
  createProposal(
    projectId: WorkspaceId,
    prompt: string,
    test: SemanticTestDto,
  ): SemanticProposalDto;
}

export class SemanticModelService implements ISemanticModelService {
  private readonly proposals = new Map<string, SemanticProposalDto>();

  constructor(
    private readonly projects: IProjectService,
    private readonly bus: DomainEventBus,
  ) {}

  list(projectId: WorkspaceId): readonly SemanticTestSummaryDto[] {
    const dir = this.testsDir(projectId);
    if (!existsSync(dir)) return [];

    return readdirSync(dir)
      .filter((name) => name.endsWith('.yaml'))
      .map((name) => {
        const slug = slugFromSemanticTestPath(join(SEMANTIC_TESTS_DIR, name)) ?? name.replace('.yaml', '');
        const content = readFileSync(join(dir, name), 'utf8');
        const test = parseSemanticTestYaml(content);
        return {
          slug,
          name: test.name,
          stepCount: test.steps.length,
          status: 'draft' as const,
          adapter: test.adapter,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get(projectId: WorkspaceId, slug: string): SemanticTestDto {
    const filePath = this.testFilePath(projectId, slug);
    if (!existsSync(filePath)) {
      throw new NotFoundError(`Semantic test "${slug}" was not found.`);
    }
    const test = parseSemanticTestYaml(readFileSync(filePath, 'utf8'));
    return toSemanticTestDto(test);
  }

  write(projectId: WorkspaceId, dto: SemanticTestDto): SemanticTestDto {
    const test = fromSemanticTestDto(dto);
    validateSemanticTest(test);

    const dir = this.testsDir(projectId);
    mkdirSync(dir, { recursive: true });

    const filePath = this.testFilePath(projectId, test.id);
    const existed = existsSync(filePath);
    writeFileSync(filePath, serializeSemanticTestYaml(test), 'utf8');

    this.bus.emit(
      existed ? 'semantic.test.updated' : 'semantic.test.created',
      { projectId, slug: test.id },
      projectId,
    );

    return toSemanticTestDto(test);
  }

  delete(projectId: WorkspaceId, slug: string): void {
    const filePath = this.testFilePath(projectId, slug);
    if (!existsSync(filePath)) {
      throw new NotFoundError(`Semantic test "${slug}" was not found.`);
    }
    unlinkSync(filePath);
  }

  previewCode(_projectId: WorkspaceId, dto: SemanticTestDto): SemanticPreviewCodeResponse {
    const test = fromSemanticTestDto(dto);
    const className = toClassName(test.id);
    const lines = test.steps.map(
      (step, i) =>
        `    // Step ${i + 1}: ${step.intent}\n    // action: ${step.action}\n    // expected: ${step.expected}`,
    );

    const content = `package com.verity.generated;

import org.junit.jupiter.api.Test;
import com.microsoft.playwright.*;

/** Generated preview — full transpiler ships in adapter-playwright-java (M3). */
public class ${className} {
  @Test
  void ${toMethodName(test.id)}() {
${lines.join('\n\n')}
  }
}
`;

    return {
      files: [
        {
          path: `src/test/java/com/verity/generated/${className}.java`,
          content,
          type: 'create',
        },
      ],
      warnings: ['Preview uses stub transpiler until Playwright Java adapter (M3) lands.'],
    };
  }

  createProposal(
    projectId: WorkspaceId,
    prompt: string,
    test: SemanticTestDto,
  ): SemanticProposalDto {
    const preview = this.previewCode(projectId, test);
    const proposal: SemanticProposalDto = {
      id: ProposalId(),
      projectId,
      prompt,
      test,
      proposedFiles: preview.files.map((f) => ({
        path: f.path,
        type: f.type,
        summary: `Generated ${f.path}`,
      })),
      proposalConfidence: 0.75,
      status: 'draft',
    };
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  applyProposal(request: SemanticApplyProposalRequest): SemanticProposalDto {
    const proposal = this.requireProposal(request.projectId, request.proposalId);
    if (proposal.status !== 'draft') {
      throw new ValidationError('This proposal has already been resolved.');
    }

    this.write(request.projectId, proposal.test);
    const repoRoot = this.repoRoot(request.projectId);
    for (const file of proposal.proposedFiles) {
      const preview = this.previewCode(request.projectId, proposal.test);
      const match = preview.files.find((f) => f.path === file.path);
      if (!match) continue;
      const abs = join(repoRoot, match.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, match.content, 'utf8');
    }

    const applied: SemanticProposalDto = { ...proposal, status: 'applied' };
    this.proposals.set(proposal.id, applied);
    this.bus.emit(
      'semantic.proposal.applied',
      { projectId: request.projectId, proposalId: request.proposalId, slug: proposal.test.id },
      request.projectId,
    );
    return applied;
  }

  discardProposal(request: SemanticDiscardProposalRequest): void {
    const proposal = this.requireProposal(request.projectId, request.proposalId);
    if (proposal.status !== 'draft') {
      throw new ValidationError('This proposal has already been resolved.');
    }
    this.proposals.set(proposal.id, { ...proposal, status: 'discarded' });
    this.bus.emit(
      'semantic.proposal.discarded',
      { projectId: request.projectId, proposalId: request.proposalId },
      request.projectId,
    );
  }

  private requireProposal(projectId: WorkspaceId, proposalId: string): SemanticProposalDto {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.projectId !== projectId) {
      throw new NotFoundError('Proposal not found.');
    }
    return proposal;
  }

  private repoRoot(projectId: WorkspaceId): string {
    const project = this.projects.get(projectId);
    if (!project.repository.path) {
      throw new ValidationError('Connect a repository before managing semantic tests.');
    }
    return project.repository.path;
  }

  private testsDir(projectId: WorkspaceId): string {
    return join(this.repoRoot(projectId), SEMANTIC_TESTS_DIR);
  }

  private testFilePath(projectId: WorkspaceId, slug: string): string {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ValidationError('Invalid semantic test slug.');
    }
    return join(this.repoRoot(projectId), semanticTestRelativePath(slug));
  }
}

function toClassName(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toMethodName(slug: string): string {
  const className = toClassName(slug);
  return className.charAt(0).toLowerCase() + className.slice(1);
}
