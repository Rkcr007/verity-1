import type { CommandChannel } from '@verity/core/ipc';
import { COMMAND_CHANNELS } from '@verity/core/ipc';
import { NotImplementedError } from '@verity/core';
import type { CommandHandler, IPCRouter } from './ipc-router.js';

const IMPLEMENTED_CHANNELS = new Set<CommandChannel>([
  'app:ping',
  'project:create',
  'project:create-draft',
  'project:list',
  'project:get',
  'project:open',
  'project:finalize',
  'settings:get',
  'settings:update',
  'repository:pick-folder',
  'repository:connect-local',
  'repository:oauth-start',
  'repository:oauth-status',
  'intelligence:detect-framework',
  'intelligence:start-analysis',
  'intelligence:get-analysis-status',
  'intelligence:get-index',
  'intelligence:get-file-tree',
  'intelligence:get-pages',
  'intelligence:get-flows',
  'intelligence:get-locators',
  'intelligence:get-summary',
  'semantic:list',
  'semantic:get',
  'semantic:write',
  'semantic:delete',
  'semantic:preview-code',
  'semantic:apply-proposal',
  'semantic:discard-proposal',
  'ai:generate',
]);

/**
 * Registers stub handlers for catalogued IPC channels not yet wired to services.
 * Prevents "no handler registered" Electron errors during M1–M4 UI development.
 */
export function registerStubHandlers(router: IPCRouter): void {
  for (const channel of COMMAND_CHANNELS) {
    if (IMPLEMENTED_CHANNELS.has(channel)) continue;

    router.handle(channel, (() => {
      throw new NotImplementedError(channel);
    }) as CommandHandler<typeof channel>);
  }
}
