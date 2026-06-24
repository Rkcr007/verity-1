import { create } from 'zustand';
import type { WorkspaceId } from '@verity/core';
import type { SemanticTestDto, SemanticTestSummaryDto } from '@verity/core/ipc';
import { invoke } from '../ipc/client.js';

interface SemanticState {
  tests: readonly SemanticTestSummaryDto[];
  selectedSlug: string | null;
  selectedTest: SemanticTestDto | null;
  loading: boolean;
  loadingDetail: boolean;
  error: string | null;
  loadTests: (projectId: WorkspaceId) => Promise<void>;
  selectTest: (projectId: WorkspaceId, slug: string) => Promise<void>;
  clearSelection: () => void;
}

export const useSemanticStore = create<SemanticState>((set) => ({
  tests: [],
  selectedSlug: null,
  selectedTest: null,
  loading: false,
  loadingDetail: false,
  error: null,

  loadTests: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const tests = await invoke('semantic:list', { projectId });
      set({ tests, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load semantic tests',
      });
    }
  },

  selectTest: async (projectId, slug) => {
    set({ selectedSlug: slug, loadingDetail: true, error: null });
    try {
      const test = await invoke('semantic:get', { projectId, slug });
      set({ selectedTest: test, loadingDetail: false });
    } catch (error) {
      set({
        loadingDetail: false,
        selectedTest: null,
        error: error instanceof Error ? error.message : 'Failed to load test',
      });
    }
  },

  clearSelection: () => set({ selectedSlug: null, selectedTest: null }),
}));
