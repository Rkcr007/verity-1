import type { DomainEvent } from '@verity/core';
import { VerityError } from '@verity/core';
import type {
  CommandChannel,
  CommandRequest,
  CommandResponse,
  EventChannel,
  EventPayload,
} from '@verity/core/ipc';

/**
 * Typed IPC client (architecture §2.2). The renderer's single door to the main
 * process, built on the preload `window.verity` bridge (resolution P-02).
 *
 * `invoke` unwraps the Result: it resolves with data on success and rejects with
 * a reconstructed VerityError on failure, so screens can use ordinary
 * try/catch and the error's safe `userMessage`.
 */
export async function invoke<C extends CommandChannel>(
  channel: C,
  request: CommandRequest<C>,
): Promise<CommandResponse<C>> {
  const result = await window.verity.invoke(channel, request);
  if (result.ok) return result.data;
  throw new VerityError({
    code: result.error.code,
    userMessage: result.error.userMessage,
    recoverable: result.error.recoverable,
    ...(result.error.detail !== undefined ? { detail: result.error.detail } : {}),
  });
}

export function on<E extends EventChannel>(
  channel: E,
  handler: (event: DomainEvent<E, EventPayload<E>>) => void,
): () => void {
  return window.verity.on(channel, handler);
}
