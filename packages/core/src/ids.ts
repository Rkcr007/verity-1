import { ulid } from 'ulid';

/**
 * Branded ID types.
 *
 * Each aggregate/entity gets a nominal ID so the compiler prevents passing a
 * RunId where a WorkspaceId is expected. All IDs are ULIDs (lexicographically
 * sortable, timestamp-prefixed). See architecture §3.3.
 */
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type RepositoryId = Brand<string, 'RepositoryId'>;
export type SemanticTestId = Brand<string, 'SemanticTestId'>;
export type RunId = Brand<string, 'RunId'>;
export type RunStepId = Brand<string, 'RunStepId'>;
export type PageId = Brand<string, 'PageId'>;
export type PageObjectId = Brand<string, 'PageObjectId'>;
export type LocatorId = Brand<string, 'LocatorId'>;
export type FlowId = Brand<string, 'FlowId'>;
export type ProposalId = Brand<string, 'ProposalId'>;
export type IndexId = Brand<string, 'IndexId'>;
export type SessionId = Brand<string, 'SessionId'>;

const make = <T extends string>(value?: string): T => (value ?? ulid()) as T;

export const WorkspaceId = (value?: string): WorkspaceId => make<WorkspaceId>(value);
export const RepositoryId = (value?: string): RepositoryId => make<RepositoryId>(value);
export const SemanticTestId = (value?: string): SemanticTestId => make<SemanticTestId>(value);
export const RunId = (value?: string): RunId => make<RunId>(value);
export const RunStepId = (value?: string): RunStepId => make<RunStepId>(value);
export const PageId = (value?: string): PageId => make<PageId>(value);
export const PageObjectId = (value?: string): PageObjectId => make<PageObjectId>(value);
export const LocatorId = (value?: string): LocatorId => make<LocatorId>(value);
export const FlowId = (value?: string): FlowId => make<FlowId>(value);
export const ProposalId = (value?: string): ProposalId => make<ProposalId>(value);
export const IndexId = (value?: string): IndexId => make<IndexId>(value);
export const SessionId = (value?: string): SessionId => make<SessionId>(value);
