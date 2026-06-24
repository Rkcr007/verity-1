import type { WorkspaceId } from './ids.js';
import type { WorkspaceStatus } from './models/project.js';

/**
 * DomainEvent base (resolution M-02, architecture §6).
 *
 * Every domain event carries the owning workspace, a monotonic `seq` for gap
 * detection on streaming channels (§6.3), and a timestamp. The `EventMap`
 * (see ./ipc) binds channel names to payloads; this is the envelope.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly type: TType;
  readonly workspaceId: WorkspaceId | null;
  readonly seq: number;
  readonly timestamp: number;
  readonly payload: TPayload;
}

/** A monotonic sequence generator scoped to a process. */
export class SequenceGenerator {
  private value = 0;
  next(): number {
    this.value += 1;
    return this.value;
  }
}

// ---- Payload shapes for EPIC 0 events (the catalog lives in ./ipc/events.ts) ----

export interface WorkspaceStatusChangedPayload {
  readonly status: WorkspaceStatus;
}

export interface ProjectCreatedPayload {
  readonly projectId: WorkspaceId;
  readonly name: string;
}
