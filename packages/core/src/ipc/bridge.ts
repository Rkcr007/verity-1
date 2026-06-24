import type { DomainEvent } from '../events.js';
import type { Result } from '../result.js';
import type { CommandChannel, CommandRequest, CommandResponse } from './commands.js';
import type { EventChannel, EventPayload } from './events.js';

/**
 * VerityBridge — the exact, minimal surface exposed on `window.verity` by the
 * Electron preload (architecture §10.3, resolution P-02). The renderer's typed
 * IPC client is built on top of this; nothing else crosses the boundary.
 */
export interface VerityBridge {
  /** Host OS — used for title-bar inset layout on macOS. */
  readonly platform: string;

  invoke<C extends CommandChannel>(
    channel: C,
    request: CommandRequest<C>,
  ): Promise<Result<CommandResponse<C>>>;

  on<E extends EventChannel>(
    channel: E,
    handler: (event: DomainEvent<E, EventPayload<E>>) => void,
  ): () => void;
}

/** Global augmentation so the renderer can read `window.verity` with full types. */
declare global {
  interface Window {
    readonly verity: VerityBridge;
  }
}
