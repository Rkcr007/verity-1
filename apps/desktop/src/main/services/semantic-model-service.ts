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
import type { DomainEventBus } from '../event-bus.js';
import type { IProjectService } from './project-service.js';
import type { IRunRepository } from '@verity/local-persistence';
import type { IAdapterRegistryService } from './adapter-registry-service.js';
import type { SemanticTestRunStatus } from '@verity/core/ipc';

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
  createProposalWithId(
    projectId: WorkspaceId,
    prompt: string,
    test: SemanticTestDto,
    proposalId: ProposalId,
  ): SemanticProposalDto;
  getProposal(projectId: WorkspaceId, proposalId: ProposalId): SemanticProposalDto;
}

export class SemanticModelService implements ISemanticModelService {
  private readonly proposals = new Map<string, SemanticProposalDto>();

  constructor(
    private readonly projects: IProjectService,
    private readonly bus: DomainEventBus,
    private readonly adapters: IAdapterRegistryService,
    private readonly runs: IRunRepository,
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
        const latest = this.runs.findLatestForTest(projectId, slug);
        const status = deriveRunStatus(latest?.status);
        return {
          slug,
          name: test.name,
          stepCount: test.steps.length,
          status,
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

  previewCode(projectId: WorkspaceId, dto: SemanticTestDto): SemanticPreviewCodeResponse {
    const result = this.adapters.transpilePreview(projectId, dto);
    return {
      files: result.files.map((f) => ({
        path: f.path,
        content: f.content,
        type: f.type,
      })),
      warnings: [...result.warnings],
    };
  }

  createProposal(
    projectId: WorkspaceId,
    prompt: string,
    test: SemanticTestDto,
  ): SemanticProposalDto {
    return this.createProposalWithId(projectId, prompt, test, ProposalId());
  }

  createProposalWithId(
    projectId: WorkspaceId,
    prompt: string,
    test: SemanticTestDto,
    proposalId: ProposalId,
  ): SemanticProposalDto {
    const preview = this.previewCode(projectId, test);
    const avgConfidence =
      test.steps.length > 0
        ? test.steps.reduce((sum, s) => sum + s.confidence, 0) / test.steps.length
        : 0.75;
    const proposal: SemanticProposalDto = {
      id: proposalId,
      projectId,
      prompt,
      test,
      proposedFiles: preview.files.map((f) => ({
        path: f.path,
        type: f.type,
        summary: `Generated ${f.path}`,
      })),
      proposalConfidence: avgConfidence,
      status: 'draft',
    };
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  getProposal(projectId: WorkspaceId, proposalId: ProposalId): SemanticProposalDto {
    return this.requireProposal(projectId, proposalId);
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

function deriveRunStatus(
  runStatus: 'passed' | 'failed' | 'cancelled' | 'running' | undefined,
): SemanticTestRunStatus {
  if (runStatus === 'passed') return 'pass';
  if (runStatus === 'failed' || runStatus === 'cancelled') return 'fail';
  return 'draft';
}
