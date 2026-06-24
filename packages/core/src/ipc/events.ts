import type { WorkspaceId } from '../ids.js';
import type {
  ProjectCreatedPayload,
  WorkspaceStatusChangedPayload,
} from '../events.js';

/**
 * EventMap (resolution P-01 / E-01) — the closed catalog of main→renderer pushed
 * events. Mirrors the architecture §6.2 event catalog; EPIC 0 wires the subset
 * that the Foundation can actually emit, plus `workspace.status.changed`
 * (added per readiness review E-01).
 *
 * Every payload travels inside a DomainEvent envelope (see ../events.ts).
 */
export interface EventMap {
  'workspace.status.changed': WorkspaceStatusChangedPayload;
  'project.created': ProjectCreatedPayload;
  'project.opened': { projectId: WorkspaceId };
}

export type EventChannel = keyof EventMap;
export type EventPayload<E extends EventChannel> = EventMap[E];

export const EVENT_CHANNELS = [
  'workspace.status.changed',
  'project.created',
  'project.opened',
] as const satisfies readonly EventChannel[];
