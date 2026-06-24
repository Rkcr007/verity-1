/**
 * Repository — value object on the Project aggregate (resolution X-01).
 *
 * Per the readiness review, Workspace = Project = Repository is a single
 * aggregate persisted in `projects`. Repository captures the connection facts.
 */
export type RepositorySource = 'local' | 'github' | 'gitlab' | 'bitbucket';

export interface Repository {
  readonly source: RepositorySource;
  /** Absolute path to the local clone / working tree. */
  readonly path: string;
  /** e.g. "acme/shop-e2e-tests"; for local sources this may equal the folder name. */
  readonly slug: string;
  readonly defaultBranch: string;
  readonly remoteUrl?: string;
}
