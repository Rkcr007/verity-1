export type { AdapterDetector } from './adapter-detector.js';

export type { MavenDependency, PomManifest } from './parsers/pom.js';
export { parsePom, effectiveDependencies, findDependency } from './parsers/pom.js';

export type { PackageJsonManifest } from './parsers/package-json.js';
export { parsePackageJson, allDependencies } from './parsers/package-json.js';

export type { GradleManifest } from './parsers/gradle.js';
export { parseGradleBuild } from './parsers/gradle.js';

export { calculateUnderstandingScore } from './enrichment/understanding-score.js';
export { enrichRepositoryIndex } from './enrichment/enrich-index.js';

export { detectDefaultBranch } from './git.js';

export { walkRepository, countPageObjectFiles } from './walk.js';

export { loadIgnorePatterns, shouldIgnorePath } from './scan/gitignore.js';
export { buildFileTree } from './scan/file-tree.js';
export { analyzeJavaFile, analyzeJavaFileFromDisk } from './scan/java-extractor.js';
export type { RepositoryScanPayload, StructuralScanResult, IndexScanStats, FileContribution } from './scan/structural-scan.js';
export { scanRepositoryStructure } from './scan/structural-scan.js';
export type { FileChange, FileChangeType, IncrementalIndexResult } from './scan/incremental-index.js';
export { applyIncrementalChanges } from './scan/incremental-index.js';

export { PlaywrightJavaDetector } from './detectors/java-stack-detector.js';
export { PlaywrightTypeScriptDetector } from './detectors/npm-stack-detector.js';

export {
  detectBestFramework,
  detectFramework,
  DEFAULT_DETECTORS,
  type FrameworkDetectionOutcome,
} from './registry.js';

export {
  inspectFolder,
  isFolderEmpty,
  detectSeleniumJavaSignals,
  recommendEntry,
  type FolderEntryKind,
  type SuggestedWizardMode,
  type FolderInspection,
  type EntryRecommendation,
} from './inspect/folder-inspect.js';

export {
  analyzeRepoFrameworkSignals,
  type RepoFrameworkSignals,
} from './analyze/repo-signals.js';

export {
  FRAMEWORK_CATALOG,
  getFrameworkCatalog,
  getCatalogEntry,
  getScaffoldableFrameworks,
  type FrameworkCatalogEntry,
  type FrameworkMaturity,
  type EnterpriseTier,
} from './catalog/framework-catalog.js';

export {
  recommendFramework,
  type RecommendFrameworkInput,
  type RecommendFrameworkMode,
  type FrameworkRecommendation,
} from './catalog/recommend-framework.js';
