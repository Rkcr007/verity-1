import type { WebContents } from 'electron';
import type { EventChannel, EventPayload } from '@verity/core/ipc';
import { EVENT_CHANNELS } from '@verity/core/ipc';
import { SequenceGenerator, type DomainEvent, type WorkspaceId } from '@verity/core';

/**
 * DomainEventBus (resolution I-02, architecture §6.1).
 *
 * A single in-process synchronous bus. Internal subscribers (services) react to
 * domain events; the IPCForwarder forwards the whitelisted set to the renderer.
 * Every emitted event is wrapped in a DomainEvent envelope with a monotonic
 * `seq` (architecture §6.3) so the renderer can detect gaps on streaming channels.
 */
export type EventHandler<E extends EventChannel> = (
  event: DomainEvent<E, EventPayload<E>>,
) => void;

export class DomainEventBus {
  private readonly handlers = new Map<EventChannel, Set<EventHandler<EventChannel>>>();
  private readonly seq = new SequenceGenerator();

  subscribe<E extends EventChannel>(channel: E, handler: EventHandler<E>): () => void {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
    }
    set.add(handler as EventHandler<EventChannel>);
    return () => set?.delete(handler as EventHandler<EventChannel>);
  }

  emit<E extends EventChannel>(
    channel: E,
    payload: EventPayload<E>,
    workspaceId: WorkspaceId | null = null,
  ): void {
    const event: DomainEvent<E, EventPayload<E>> = {
      type: channel,
      workspaceId,
      seq: this.seq.next(),
      timestamp: Date.now(),
      payload,
    };
    const set = this.handlers.get(channel);
    if (!set) return;
    for (const handler of set) {
      (handler as EventHandler<E>)(event);
    }
  }
}

/**
 * IPCForwarder — bridges the bus to a renderer's WebContents. Only channels in
 * the closed EVENT_CHANNELS whitelist are forwarded (architecture §6.1).
 */
export class IPCForwarder {
  private readonly unsubscribes: Array<() => void> = [];

  constructor(
    private readonly bus: DomainEventBus,
    private readonly webContents: WebContents,
  ) {}

  start(): void {
    for (const channel of EVENT_CHANNELS) {
      const off = this.bus.subscribe(channel, (event) => {
        if (this.webContents.isDestroyed()) return;
        this.webContents.send(channel, event);
      });
      this.unsubscribes.push(off);
    }
  }

  stop(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
  }
}
