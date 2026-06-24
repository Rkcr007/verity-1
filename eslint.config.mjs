// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Root flat ESLint config.
 *
 * The most important rule here enforces ARCHITECTURAL DECISION AD-002:
 * "The core platform must never depend directly on any test framework."
 *
 * Only packages matching `packages/adapter-*` may import a framework SDK
 * (playwright, selenium, cypress, webdriverio). Everywhere else it is a
 * hard error. A complementary CI grep guards against bypasses.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/out/**', '**/build/**', '**/node_modules/**', '**/.turbo/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  // AD-002 boundary: forbid framework SDK imports outside adapter packages.
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    ignores: ['packages/adapter-*/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'playwright',
                'playwright-*',
                '@playwright/*',
                'selenium-webdriver',
                'cypress',
                'webdriverio',
              ],
              message:
                'AD-002: test-framework SDKs may only be imported inside packages/adapter-*. ' +
                'The core platform must remain framework-neutral.',
            },
          ],
        },
      ],
    },
  },
);
