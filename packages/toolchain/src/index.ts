import type { AdapterId } from '@verity/core';
import { installJavaToolchain, installNodeToolchain, type ToolchainInstallResult } from './install.js';

/**
 * Installs host toolchain prerequisites for the given adapter (M7).
 */
export function installToolchainForAdapter(adapterId: AdapterId): ToolchainInstallResult {
  switch (adapterId) {
    case 'playwright-java':
    case 'selenium-java':
      return installJavaToolchain();
    case 'playwright-typescript':
    case 'cypress':
      return installNodeToolchain();
    default:
      return {
        steps: [{ name: 'Toolchain', status: 'skipped', detail: `No bundled install for ${adapterId}.` }],
        ready: false,
      };
  }
}

export { installJavaToolchain, installNodeToolchain };
export type { ToolchainInstallResult, ToolchainInstallStep, ToolchainStepStatus } from './install.js';
