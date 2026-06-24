import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { DomainEvent } from '@verity/core';
import type {
  CommandChannel,
  CommandRequest,
  CommandResponse,
  EventChannel,
  EventPayload,
  VerityBridge,
} from '@verity/core/ipc';
import { COMMAND_CHANNELS, EVENT_CHANNELS } from '@verity/core/ipc';
import type { Result } from '@verity/core';

/**
 * Preload bridge (architecture §10.3, resolution P-02).
 *
 * Exposes exactly two methods on `window.verity`. Channel names are validated
 * against the closed COMMAND/EVENT whitelists so the renderer cannot reach an
 * arbitrary IPC channel even if the contract types are bypassed. contextIsolation
 * keeps this bridge isolated from page script (§10.2).
 */
const commandSet = new Set<string>(COMMAND_CHANNELS);
const eventSet = new Set<string>(EVENT_CHANNELS);

const bridge: VerityBridge = {
  platform: process.platform,

  invoke<C extends CommandChannel>(
    channel: C,
    request: CommandRequest<C>,
  ): Promise<Result<CommandResponse<C>>> {
    if (!commandSet.has(channel)) {
      return Promise.resolve({
        ok: false,
        error: {
          code: 'IPC_CHANNEL_UNKNOWN',
          userMessage: 'This action is not available.',
          recoverable: false,
          detail: `Unknown command channel: ${channel}`,
        },
      });
    }
    return ipcRenderer.invoke(channel, request) as Promise<Result<CommandResponse<C>>>;
  },

  on<E extends EventChannel>(
    channel: E,
    handler: (event: DomainEvent<E, EventPayload<E>>) => void,
  ): () => void {
    if (!eventSet.has(channel)) {
      return () => undefined;
    }
    const listener = (_event: IpcRendererEvent, payload: DomainEvent<E, EventPayload<E>>): void =>
      handler(payload);
    ipcRenderer.on(channel, listener as (e: IpcRendererEvent, ...args: unknown[]) => void);
    return () =>
      ipcRenderer.removeListener(
        channel,
        listener as (e: IpcRendererEvent, ...args: unknown[]) => void,
      );
  },
};

contextBridge.exposeInMainWorld('verity', bridge);
