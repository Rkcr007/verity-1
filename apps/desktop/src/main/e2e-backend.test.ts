import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, before, after } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createSemanticTest } from '@verity/semantic-model';
import { buildContainer } from './container.js';
import { Tokens } from './tokens.js';
import { toSemanticTestDto } from './mappers/semantic-mapper.js';

const SAMPLE_POM = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <properties><playwright.version>1.48.0</playwright.version></properties>
  <dependencies>
    <dependency>
      <groupId>com.microsoft.playwright</groupId>
      <artifactId>playwright</artifactId>
      <version>\${playwright.version}</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`;

const LOGIN_PAGE = `package pages;
import com.microsoft.playwright.Page;
public class LoginPage {
  public void signIn(Page page) {
    page.getByRole("button", "Sign in").click();
    page.getByPlaceholder("Email").fill("user@test.com");
  }
}`;

const LOGIN_TEST = `package tests;
import org.junit.jupiter.api.Test;
public class LoginTest {
  @Test
  void userCanLogin() {}
}`;

function initGitRepo(root: string): void {
  execSync('git init -b main', { cwd: root, stdio: 'pipe' });
  execSync('git config user.email "e2e@verity.local"', { cwd: root, stdio: 'pipe' });
  execSync('git config user.name "Verity E2E"', { cwd: root, stdio: 'pipe' });
  execSync('git add .', { cwd: root, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: root, stdio: 'pipe' });
}

function seedRepo(root: string): void {
  writeFileSync(join(root, 'pom.xml'), SAMPLE_POM);
  mkdirSync(join(root, 'src', 'test', 'java', 'pages'), { recursive: true });
  mkdirSync(join(root, 'src', 'test', 'java', 'tests'), { recursive: true });
  writeFileSync(join(root, 'src', 'test', 'java', 'pages', 'LoginPage.java'), LOGIN_PAGE);
  writeFileSync(join(root, 'src', 'test', 'java', 'tests', 'LoginTest.java'), LOGIN_TEST);
}

describe('backend E2E flow', () => {
  let repoRoot = '';
  let dbPath = '';
  let container: ReturnType<typeof buildContainer>;

  before(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'verity-e2e-repo-'));
    dbPath = join(mkdtempSync(join(tmpdir(), 'verity-e2e-db-')), 'verity.db');
    seedRepo(repoRoot);
    initGitRepo(repoRoot);
    container = buildContainer({ dbPath });
  });

  after(async () => {
    await delay(500);
    await container.dispose();
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('runs wizard → analyze → semantic CRUD → AI generate', async () => {
    const projects = container.resolve(Tokens.ProjectService);
    const repo = container.resolve(Tokens.RepositoryConnector);
    const intel = container.resolve(Tokens.IntelligenceService);
    const semantic = container.resolve(Tokens.SemanticModelService);
    const ai = container.resolve(Tokens.AiService);
    const indexCache = container.resolve(Tokens.IndexCacheRepository);

    const draft = projects.createDraft('E2E Workspace');
    repo.connectLocal(draft.id, repoRoot);

    const framework = intel.detectFramework(draft.id);
    assert.equal(framework.adapterId, 'playwright-java');
    assert.equal(framework.buildTool, 'maven');

    const jobId = intel.startAnalysis(draft.id);
    let status = intel.getAnalysisStatus(draft.id, jobId);
    for (let i = 0; i < 20 && status.status !== 'completed'; i += 1) {
      await delay(100);
      status = intel.getAnalysisStatus(draft.id, jobId);
    }
    assert.equal(status.status, 'completed');
    assert.ok(status.progress.pageObjects >= 1);
    assert.ok(status.progress.understandingScore > 0);

    const cached = indexCache.findByWorkspaceId(draft.id);
    assert.ok(cached);
    assert.ok(cached.payload.locators.length >= 2);
    assert.ok(cached.payload.fileTree.length > 0);

    const index = intel.getIndex(draft.id);
    assert.equal(index.pages.length, cached.payload.pages.length);
    assert.ok(intel.getFileTree(draft.id).length > 0);

    const test = createSemanticTest({
      id: 'login-smoke-001',
      name: 'Login smoke',
      adapter: 'playwright-java',
      promptVersion: 'manual@1.0.0',
      steps: [
        {
          id: 1,
          intent: 'Sign in',
          action: 'click',
          context: 'Login page',
          expected: 'Dashboard visible',
          confidence: 0.9,
          locators: [{ ref: 'sign-in', strategy: 'role', value: 'Sign in', invented: false }],
        },
      ],
    });
    semantic.write(draft.id, toSemanticTestDto(test));

    const listed = semantic.list(draft.id);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.slug, 'login-smoke-001');

    const fetched = semantic.get(draft.id, 'login-smoke-001');
    assert.equal(fetched.name, 'Login smoke');

    const preview = semantic.previewCode(draft.id, fetched);
    assert.ok(preview.files.length > 0);
    assert.match(preview.files[0]?.content ?? '', /LoginSmoke001/);

    const generated = ai.generate({
      projectId: draft.id,
      prompt: 'Checkout flow for guest user',
    });
    assert.ok(generated.proposalId);
    assert.ok(generated.sessionId);

    const finalized = projects.finalize(draft.id);
    assert.equal(finalized.status, 'READY');

    semantic.delete(draft.id, 'login-smoke-001');
    assert.equal(semantic.list(draft.id).length, 0);
  });

  it('runs apply → git status → commit flow (M6 E2E)', async () => {
    const projects = container.resolve(Tokens.ProjectService);
    const repo = container.resolve(Tokens.RepositoryConnector);
    const semantic = container.resolve(Tokens.SemanticModelService);
    const git = container.resolve(Tokens.GitService);
    const ai = container.resolve(Tokens.AiService);

    const draft = projects.createDraft('Git E2E Workspace');
    repo.connectLocal(draft.id, repoRoot);

    const generated = ai.generate({
      projectId: draft.id,
      prompt: 'Add checkout smoke test',
    });

    for (let i = 0; i < 40; i += 1) {
      await delay(150);
      try {
        const proposal = semantic.getProposal(draft.id, generated.proposalId);
        if (proposal.status === 'draft' && proposal.test.steps.length > 0) {
          semantic.applyProposal({ projectId: draft.id, proposalId: generated.proposalId });
          break;
        }
        if (proposal.status === 'applied') break;
      } catch {
        // proposal not ready yet
      }
    }

    const statusBefore = await git.getStatus({ projectId: draft.id });
    assert.ok(statusBefore.changes.length > 0, 'expected working tree changes after apply');

    const paths = statusBefore.changes.map((change) => change.path);
    const commit = await git.commit({
      projectId: draft.id,
      message: 'test: e2e semantic apply',
      files: paths,
    });
    assert.ok(commit.commitSha.length > 0);

    const statusAfter = await git.getStatus({ projectId: draft.id });
    assert.equal(statusAfter.changes.length, 0);

    const branches = await git.listBranches({ projectId: draft.id });
    assert.ok(branches.branches.includes('main'));

    const featureBranch = 'verity/e2e-feature';
    const switched = await git.checkoutBranch({
      projectId: draft.id,
      branch: featureBranch,
      create: true,
    });
    assert.equal(switched.branch, featureBranch);
  });
});
