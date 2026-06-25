import { create } from 'zustand';
import type { AdapterId, WorkspaceId } from '@verity/core';
import type { PrerequisiteReportDto } from '@verity/core/ipc';
import { invoke } from '../ipc/client.js';

interface WorkspacePrereqState {
  report: PrerequisiteReportDto | null;
  loading: boolean;
  installBusy: boolean;
  load: (projectId: WorkspaceId) => Promise<void>;
  installToolchain: (adapterId: AdapterId) => Promise<boolean>;
  reset: () => void;
}

export const useWorkspacePrereqStore = create<WorkspacePrereqState>((set) => ({
  report: null,
  loading: false,
  installBusy: false,

  load: async (projectId) => {
    set({ loading: true });
    try {
      const report = await invoke('adapter:check-prerequisites', { projectId });
      set({ report, loading: false });
    } catch {
      set({ report: null, loading: false });
    }
  },

  installToolchain: async (adapterId) => {
    set({ installBusy: true });
    try {
      const result = await invoke('toolchain:install-for-adapter', { adapterId });
      set({ installBusy: false });
      return result.setup.ready;
    } catch {
      set({ installBusy: false });
      return false;
    }
  },

  reset: () => set({ report: null, loading: false, installBusy: false }),
}));
