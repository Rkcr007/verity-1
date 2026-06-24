/**
 * Framework — value object describing the detected test stack (architecture §3.4).
 * `adapterId` is the stable key the AdapterRegistry resolves against.
 */
export type AdapterId =
  | 'playwright-java'
  | 'selenium-java'
  | 'playwright-typescript'
  | 'selenium-python'
  | 'cypress';

export type BuildTool = 'maven' | 'gradle' | 'npm' | 'pnpm' | 'pip' | 'unknown';

export type TestPattern = 'page-object-model' | 'screenplay' | 'flat' | 'unknown';

export interface Framework {
  readonly adapterId: AdapterId;
  readonly version: string;
  readonly buildTool: BuildTool;
  readonly testFramework: string;
  readonly pattern: TestPattern;
}
