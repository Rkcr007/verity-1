import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ValidationError,
  type AdapterId,
  type Project,
  type WorkspaceId,
} from '@verity/core';
import type {
  EntryRecommendationDto,
  EnvironmentSetupResultDto,
  FolderInspectionDto,
  FrameworkCatalogEntryDto,
  FrameworkRecommendationDto,
  MigrationPlanDto,
  RecommendFrameworkRequest,
} from '@verity/core/ipc';
import {
  scaffoldPlaywrightJava,
  setupPlaywrightJavaEnvironment,
} from '@verity/adapter-playwright-java';
import {
  scaffoldPlaywrightTypeScript,
  setupPlaywrightTypeScriptEnvironment,
} from '@verity/adapter-playwright-typescript';
import { recommendFrameworkHybrid } from '@verity/ai-orchestration';
import { installToolchainForAdapter } from '@verity/toolchain';
import {
  analyzeRepoFrameworkSignals,
  detectSeleniumJavaSignals,
  getCatalogEntry,
  getFrameworkCatalog,
  inspectFolder,
  recommendEntry,
} from '@verity/repository-intelligence';
import {
  mapRecommendFrameworkRequest,
  resolveScaffoldAdapterId,
  toEnvironmentSetupResultDto,
  toFrameworkCatalogEntryDto,
  toFrameworkRecommendationDto,
} from '../mappers/framework-intelligence-mapper.js';
import type { IProjectService } from './project-service.js';
import type { IRepositoryConnectorService } from './repository-connector-service.js';
import type { IIntelligenceService } from './intelligence-service.js';

const DEMO_PROJECT_NAME = 'Verity Demo Shop';

export interface IWorkspaceEntryService {
  getRecent(): Project | null;
  inspectFolder(path: string): FolderInspectionDto;
  recommendEntry(path?: string): EntryRecommendationDto;
  getFrameworkCatalog(): readonly FrameworkCatalogEntryDto[];
  recommendFramework(request: RecommendFrameworkRequest): Promise<FrameworkRecommendationDto>;
  installToolchain(adapterId: AdapterId): EnvironmentSetupResultDto;
  scaffoldGreenfield(
    projectId: WorkspaceId,
    localPath: string,
    adapterId?: AdapterId,
    appDescription?: string,
  ): { project: Project; filesCreated: number; setup: EnvironmentSetupResultDto };
  setupEnvironment(projectId: WorkspaceId): EnvironmentSetupResultDto;
  openDemo(): Project;
  getMigrationPlan(projectId: WorkspaceId): MigrationPlanDto;
}

/**
 * WorkspaceEntryService (M1.5) — Welcome routing, greenfield scaffold, demo sandbox, resume.
 */
export class WorkspaceEntryService implements IWorkspaceEntryService {
  constructor(
    private readonly projects: IProjectService,
    private readonly connector: IRepositoryConnectorService,
    private readonly intelligence: IIntelligenceService,
    private readonly demoAssetsPath: string,
  ) {}

  getRecent(): Project | null {
    const candidates = this.projects
      .list()
      .filter((p) => p.status === 'READY' && (p.repository.path?.length ?? 0) > 0)
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    return candidates[0] ?? null;
  }

  inspectFolder(path: string): FolderInspectionDto {
    return inspectFolder(path);
  }

  recommendEntry(path?: string): EntryRecommendationDto {
    if (!path?.trim()) {
      const recent = this.getRecent();
      if (recent) {
        return {
          mode: 'existing',
          headline: `Resume ${recent.name}`,
          reasons: ['Your last workspace is ready to continue.'],
          confidence: 0.92,
        };
      }
    }
    const inspection = path?.trim() ? inspectFolder(path) : null;
    const rec = recommendEntry(inspection, path ? 'folder-picked' : 'welcome');
    return {
      mode: rec.mode,
      headline: rec.headline,
      reasons: rec.reasons,
      confidence: rec.confidence,
    };
  }

  getFrameworkCatalog(): readonly FrameworkCatalogEntryDto[] {
    return getFrameworkCatalog().map(toFrameworkCatalogEntryDto);
  }

  async recommendFramework(request: RecommendFrameworkRequest): Promise<FrameworkRecommendationDto> {
    const repoSignals = request.repoPath?.trim()
      ? analyzeRepoFrameworkSignals(request.repoPath)
      : null;
    const input = mapRecommendFrameworkRequest(request);
    const hybrid = await recommendFrameworkHybrid(input, getFrameworkCatalog(), repoSignals);
    return toFrameworkRecommendationDto(hybrid, hybrid.source);
  }

  installToolchain(adapterId: AdapterId): EnvironmentSetupResultDto {
    return toEnvironmentSetupResultDto(installToolchainForAdapter(adapterId));
  }

  scaffoldGreenfield(
    projectId: WorkspaceId,
    localPath: string,
    adapterId?: AdapterId,
    appDescription?: string,
  ): { project: Project; filesCreated: number; setup: EnvironmentSetupResultDto } {
    const resolvedAdapter = resolveScaffoldAdapterId(adapterId);
    const catalogEntry = getCatalogEntry(resolvedAdapter);
    if (!catalogEntry?.scaffoldSupported) {
      throw new ValidationError(
        `${catalogEntry?.displayName ?? resolvedAdapter} scaffolding is not available yet.`,
        'Playwright Java is ready today — pick it to scaffold a working enterprise stack.',
      );
    }

    const inspection = inspectFolder(localPath);
    if (!inspection.isEmpty) {
      throw new ValidationError(
        'Choose an empty folder to scaffold a new test project.',
        inspection.headline,
      );
    }

    const draft = this.projects.get(projectId);
    const scaffoldOptions: { projectName: string; appDescription?: string } = {
      projectName: draft.name,
    };
    if (appDescription?.trim()) {
      scaffoldOptions.appDescription = appDescription.trim();
    }

    let filesCreated = 0;
    let framework = draft.framework;

    if (resolvedAdapter === 'playwright-java') {
      const result = scaffoldPlaywrightJava(localPath, scaffoldOptions);
      filesCreated = result.filesCreated;
      framework = result.framework;
    } else if (resolvedAdapter === 'playwright-typescript') {
      const result = scaffoldPlaywrightTypeScript(localPath, scaffoldOptions);
      filesCreated = result.filesCreated;
      framework = result.framework;
    } else {
      throw new ValidationError(`Scaffold not implemented for ${resolvedAdapter}.`);
    }

    this.connector.connectLocal(projectId, localPath);
    const updated = this.projects.updateFramework(projectId, framework);
    const setup = toEnvironmentSetupResultDto(
      resolvedAdapter === 'playwright-typescript'
        ? setupPlaywrightTypeScriptEnvironment(localPath)
        : setupPlaywrightJavaEnvironment(localPath),
    );

    return { project: updated, filesCreated, setup };
  }

  setupEnvironment(projectId: WorkspaceId): EnvironmentSetupResultDto {
    const project = this.projects.get(projectId);
    const repoPath = project.repository.path ?? '';
    if (!repoPath) {
      throw new ValidationError('Connect a repository before running environment setup.');
    }
    if (project.framework.adapterId === 'playwright-java') {
      return toEnvironmentSetupResultDto(setupPlaywrightJavaEnvironment(repoPath));
    }
    if (project.framework.adapterId === 'playwright-typescript') {
      return toEnvironmentSetupResultDto(setupPlaywrightTypeScriptEnvironment(repoPath));
    }
    return { steps: [], ready: false };
  }

  openDemo(): Project {
    const existing = this.projects.list().find((p) => p.name === DEMO_PROJECT_NAME);
    if (existing) {
      return this.projects.open(existing.id);
    }

    if (!existsSync(this.demoAssetsPath)) {
      throw new ValidationError(
        'Demo workspace assets are missing.',
        this.demoAssetsPath,
      );
    }

    mkdirSync(this.demoInstallPath(), { recursive: true });
    cpSync(this.demoAssetsPath, this.demoInstallPath(), { recursive: true });

    const framework = {
      adapterId: 'playwright-java' as const,
      version: '1.49.0',
      buildTool: 'maven' as const,
      testFramework: 'JUnit 5',
      pattern: 'page-object-model' as const,
    };

    const created = this.projects.create({
      name: DEMO_PROJECT_NAME,
      repository: {
        source: 'local' as const,
        path: this.demoInstallPath(),
        slug: 'demo-shop-e2e',
        defaultBranch: 'main',
      },
      framework,
    });

    this.intelligence.startAnalysis(created.id);
    const ready = this.projects.finalize(created.id);
    return this.projects.open(ready.id);
  }

  getMigrationPlan(projectId: WorkspaceId): MigrationPlanDto {
    const project = this.projects.get(projectId);
    const repoPath = project.repository.path ?? '';
    const selenium = detectSeleniumJavaSignals(repoPath);
    if (!selenium.detected) {
      throw new ValidationError(
        'Migration planning requires a Selenium Java repository.',
      );
    }

    return {
      sourceAdapter: 'selenium-java',
      targetAdapter: 'playwright-java',
      estimatedEffort: 'incremental',
      steps: [
        {
          phase: 'Index',
          title: 'Map existing Selenium tests and page objects',
          detail:
            'Verity indexes your current test classes, utilities, and locator patterns without changing source files.',
        },
        {
          phase: 'Semantic layer',
          title: 'Author semantic tests alongside Selenium',
          detail:
            'Create `.verity/tests/*.yaml` definitions that describe intent. Framework code stays review-gated.',
        },
        {
          phase: 'Transpile',
          title: 'Generate Playwright Java from semantic tests',
          detail:
            'Use the Playwright Java adapter to project new tests while Selenium suites keep running in CI.',
        },
        {
          phase: 'Cutover',
          title: 'Migrate flow-by-flow',
          detail:
            'Replace high-value Selenium classes incrementally. Retire Selenium dependencies when coverage reaches your threshold.',
        },
      ],
    };
  }

  private demoInstallPath(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { app } = require('electron');
      return join(app.getPath('userData'), 'demo-shop-e2e');
    } catch {
      return join(tmpdir(), 'verity-demo-shop-e2e');
    }
  }
}
