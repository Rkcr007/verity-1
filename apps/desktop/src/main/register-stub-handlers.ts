import type { CommandChannel } from '@verity/core/ipc';
import { COMMAND_CHANNELS } from '@verity/core/ipc';
import { NotImplementedError } from '@verity/core';
import type { CommandHandler, IPCRouter } from './ipc-router.js';

const IMPLEMENTED_CHANNELS = new Set<CommandChannel>([
  'app:ping',
  'app:get-update-status',
  'app:check-for-updates',
  'app:download-update',
  'app:install-update',
  'project:create',
  'project:create-draft',
  'project:list',
  'project:get',
  'project:open',
  'project:finalize',
  'project:get-recent',
  'project:open-demo',
  'project:scaffold-greenfield',
  'project:setup-environment',
  'settings:get',
  'settings:update',
  'repository:pick-folder',
  'repository:pick-parent-folder',
  'repository:create-folder',
  'repository:connect-local',
  'repository:oauth-start',
  'repository:oauth-status',
  'repository:inspect-folder',
  'repository:read-file',
  'intelligence:detect-framework',
  'intelligence:start-analysis',
  'intelligence:get-analysis-status',
  'intelligence:get-index',
  'intelligence:get-file-tree',
  'intelligence:get-pages',
  'intelligence:get-flows',
  'intelligence:get-locators',
  'intelligence:get-summary',
  'intelligence:recommend-entry',
  'intelligence:get-framework-catalog',
  'intelligence:recommend-framework',
  'toolchain:install-for-adapter',
  'intelligence:get-migration-plan',
  'semantic:list',
  'semantic:get',
  'semantic:write',
  'semantic:delete',
  'semantic:preview-code',
  'semantic:apply-proposal',
  'semantic:discard-proposal',
  'semantic:get-proposal',
  'ai:generate',
  'ai:get-capabilities',
  'execution:run',
  'execution:cancel',
  'execution:get',
  'execution:list',
  'adapter:list',
  'adapter:check-prerequisites',
  'git:get-status',
  'git:get-diff',
  'git:commit',
  'git:push',
  'git:list-branches',
  'git:checkout-branch',
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
