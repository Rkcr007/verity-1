import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { CommandChannel, CommandRequest, CommandResponse } from '@verity/core/ipc';
import { type Result, VerityError, ok, err } from '@verity/core';

/**
 * IPCRouter (resolution I-02, architecture §2.1 / §10.3).
 *
 * Wraps Electron's `ipcMain.handle` so every command handler returns a typed
 * `Result`. Handlers may throw; the router normalizes any thrown value into a
 * SerializedError, guaranteeing the renderer never sees a raw stack trace
 * (architecture §2.4). Only registered channels are reachable.
 */
export type CommandHandler<C extends CommandChannel> = (
  request: CommandRequest<C>,
  event: IpcMainInvokeEvent,
) => Promise<CommandResponse<C>> | CommandResponse<C>;

export class IPCRouter {
  private readonly registered = new Set<CommandChannel>();

  handle<C extends CommandChannel>(channel: C, handler: CommandHandler<C>): this {
    if (this.registered.has(channel)) {
      throw new Error(`IPC channel already registered: ${channel}`);
    }
    this.registered.add(channel);

    ipcMain.handle(
      channel,
      async (
        event: IpcMainInvokeEvent,
        request: CommandRequest<C>,
      ): Promise<Result<CommandResponse<C>>> => {
        try {
          const data = await handler(request, event);
          return ok(data);
        } catch (error) {
          return err(VerityError.from(error));
        }
      },
    );
    return this;
  }

  dispose(): void {
    for (const channel of this.registered) {
      ipcMain.removeHandler(channel);
    }
    this.registered.clear();
  }
}
