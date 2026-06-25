import { create } from 'zustand';
import { on } from '../ipc/client.js';

interface IndexingState {
  readonly indexingByProject: Readonly<Record<string, boolean>>;
  isIndexing: (projectId: string) => boolean;
  bindIndexingEvents: (projectId: string) => () => void;
}

/**
 * Tracks repository re-indexing (S-10) from analysis and file-change events.
 */
export const useIndexingStore = create<IndexingState>((set, get) => ({
  indexingByProject: {},

  isIndexing(projectId: string): boolean {
    return get().indexingByProject[projectId] ?? false;
  },

  bindIndexingEvents(projectId: string): () => void {
    const setIndexing = (indexing: boolean): void => {
      set((state) => ({
        indexingByProject: { ...state.indexingByProject, [projectId]: indexing },
      }));
    };

    const offStarted = on('repository.analysis.started', (event) => {
      if (event.payload.projectId === projectId) setIndexing(true);
    });

    const offCompleted = on('repository.analysis.completed', (event) => {
      if (event.payload.projectId === projectId) setIndexing(false);
    });

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const offFile = on('repository.file.changed', (event) => {
      if (event.payload.projectId !== projectId) return;
      setIndexing(true);
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => setIndexing(false), 1800);
    });

    return () => {
      offStarted();
      offCompleted();
      offFile();
      if (settleTimer) clearTimeout(settleTimer);
    };
  },
}));
