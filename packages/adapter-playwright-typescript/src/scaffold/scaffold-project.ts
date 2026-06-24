import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSemanticTest, serializeSemanticTestYaml } from '@verity/semantic-model';
import type { Framework } from '@verity/core';

export interface ScaffoldOptions {
  readonly projectName: string;
  readonly appDescription?: string;
  readonly baseUrl?: string;
}

export interface ScaffoldResult {
  readonly filesCreated: number;
  readonly framework: Framework;
}

const PLAYWRIGHT_VERSION = '1.49.0';

function packageJson(projectName: string): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return JSON.stringify(
    {
      name: slug,
      version: '1.0.0',
      private: true,
      description: `${projectName} — Playwright TypeScript E2E tests (Verity scaffold)`,
      scripts: {
        test: 'playwright test',
        'test:ui': 'playwright test --ui',
        'test:headed': 'playwright test --headed',
      },
      devDependencies: {
        '@playwright/test': PLAYWRIGHT_VERSION,
        typescript: '^5.5.4',
      },
    },
    null,
    2,
  );
}

function playwrightConfig(baseUrl: string): string {
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: '${baseUrl}',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
`;
}

function tsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['pages/**/*.ts', 'tests/**/*.ts', 'playwright.config.ts'],
    },
    null,
    2,
  );
}

function loginPageTs(baseUrl: string): string {
  return `import type { Page } from '@playwright/test';

/** Login page object — scaffolded by Verity (${baseUrl}). */
export class LoginPage {
  constructor(
    private readonly page: Page,
    private readonly baseUrl: string,
  ) {}

  async open(): Promise<void> {
    await this.page.goto(\`\${this.baseUrl}/login\`);
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
`;
}

function smokeSpecTs(): string {
  return `import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page.js';

test.describe('Smoke', () => {
  test('login page loads', async ({ page, baseURL }) => {
    const login = new LoginPage(page, baseURL ?? 'https://example.com');
    await login.open();
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});
`;
}

function gitignore(): string {
  return `node_modules/
test-results/
playwright-report/
playwright/.cache/
dist/
.env
`;
}

function readme(projectName: string, description: string): string {
  return `# ${projectName}

${description}

Scaffolded by Verity — AI-Native Test Engineering Workspace.

## Run tests

\`\`\`bash
npm install
npx playwright install chromium
npm test
\`\`\`

Semantic tests live in \`.verity/tests/\`. Framework code is generated from those definitions.
`;
}

function starterSemanticTest(baseUrl: string) {
  return createSemanticTest({
    id: 'smoke-login',
    name: 'Smoke — login page loads',
    adapter: 'playwright-typescript',
    promptVersion: 'scaffold-v1',
    steps: [
      {
        id: 1,
        intent: 'Open the login page',
        action: 'navigate',
        context: `Application base URL ${baseUrl}`,
        expected: 'Login form is visible',
        confidence: 0.92,
        locators: [{ ref: 'LoginPage.open', strategy: 'role', value: 'Sign in', invented: false }],
      },
      {
        id: 2,
        intent: 'Verify login form renders',
        action: 'assert',
        context: 'Email and password fields present',
        expected: 'User can start authentication flow',
        confidence: 0.9,
        locators: [{ ref: 'LoginPage.email', strategy: 'label', value: 'Email', invented: false }],
      },
    ],
  });
}

/**
 * Scaffolds a Playwright TypeScript project with page objects and starter semantic test (M1.7).
 */
export function scaffoldPlaywrightTypeScript(repoRoot: string, options: ScaffoldOptions): ScaffoldResult {
  const baseUrl = options.baseUrl ?? 'https://example.com';
  const description =
    options.appDescription?.trim() ||
    'Playwright TypeScript end-to-end test project scaffolded by Verity.';

  const dirs = [
    join(repoRoot, 'pages'),
    join(repoRoot, 'tests'),
    join(repoRoot, '.verity', 'tests'),
  ];
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  const files: Array<[string, string]> = [
    [join(repoRoot, 'package.json'), packageJson(options.projectName)],
    [join(repoRoot, 'playwright.config.ts'), playwrightConfig(baseUrl)],
    [join(repoRoot, 'tsconfig.json'), tsConfig()],
    [join(repoRoot, 'README.md'), readme(options.projectName, description)],
    [join(repoRoot, '.gitignore'), gitignore()],
    [join(repoRoot, 'pages', 'login.page.ts'), loginPageTs(baseUrl)],
    [join(repoRoot, 'tests', 'smoke-login.spec.ts'), smokeSpecTs()],
    [
      join(repoRoot, '.verity', 'tests', 'smoke-login.yaml'),
      serializeSemanticTestYaml(starterSemanticTest(baseUrl)),
    ],
  ];

  for (const [filePath, content] of files) {
    writeFileSync(filePath, content, 'utf8');
  }

  const framework: Framework = {
    adapterId: 'playwright-typescript',
    version: PLAYWRIGHT_VERSION,
    buildTool: 'npm',
    testFramework: 'Playwright Test',
    pattern: 'page-object-model',
  };

  return { filesCreated: files.length, framework };
}
