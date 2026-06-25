export { GitCommandError, runGit } from './subprocess.js';
export type { RunGitOptions } from './subprocess.js';

export { getStatus, parsePorcelainStatus } from './status.js';
export type { GitChange, GitStatusResult } from './status.js';

export { getDiff, parseUnifiedDiff } from './diff.js';
export type { DiffLine, DiffLineKind } from './diff.js';

export { commitChanges } from './commit.js';
export type { CommitOptions, CommitResult } from './commit.js';

export {
  pushCurrentBranch,
  classifyPushFailure,
  PushRejectedError,
} from './push.js';
export type { PushResult, PushFailure, PushFailureReason } from './push.js';

export { listBranches } from './branch.js';
export type { BranchInfo } from './branch.js';

export { checkoutBranch, createBranch } from './checkout.js';
