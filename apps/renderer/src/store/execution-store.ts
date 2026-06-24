import { create } from 'zustand';
import type { RunId, WorkspaceId } from '@verity/core';
import type { ExecutionRunDto } from '@verity/core/ipc';
import { invoke, on } from '../ipc/client.js';

export interface ExecutionLogEntry {
  readonly timestamp: number;
  readonly message: string;
  readonly type: 'info' | 'step' | 'error' | 'success';
}

interface ExecutionState {
  runs: readonly ExecutionRunDto[];
  activeRunId: string | null;
  activeRun: ExecutionRunDto | null;
  running: boolean;
  logs: readonly ExecutionLogEntry[];
  loading: boolean;
  loadRuns: (projectId: WorkspaceId) => Promise<void>;
  runTest: (projectId: WorkspaceId, slug: string) => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  refreshRun: (runId: string) => Promise<void>;
  appendLog: (entry: ExecutionLogEntry) => void;
  clearLogs: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  runs: [],
  activeRunId: null,
  activeRun: null,
  running: false,
  logs: [],
  loading: false,

  loadRuns: async (projectId) => {
    set({ loading: true });
    try {
      const runs = await invoke('execution:list', { projectId });
      set({ runs, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  runTest: async (projectId, slug) => {
    get().clearLogs();
    set({ running: true });
    get().appendLog({ timestamp: Date.now(), message: `Starting run for ${slug}…`, type: 'info' });
    try {
      const { runId } = await invoke('execution:run', { projectId, semanticTestSlug: slug });
      set({ activeRunId: runId, running: true });
      await get().refreshRun(runId);
    } catch (error) {
      get().appendLog({
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : 'Run failed to start',
        type: 'error',
      });
      set({ running: false });
    }
  },

  cancelRun: async (runId) => {
    await invoke('execution:cancel', { runId: runId as RunId });
    get().appendLog({ timestamp: Date.now(), message: 'Run cancelled.', type: 'info' });
    set({ running: false });
  },

  refreshRun: async (runId) => {
    const run = await invoke('execution:get', { runId: runId as RunId });
    set({ activeRun: run });
  },

  appendLog: (entry) => {
    set((s) => ({ logs: [...s.logs, entry] }));
  },

  clearLogs: () => set({ logs: [] }),

  reset: () =>
    set({
      runs: [],
      activeRunId: null,
      activeRun: null,
      running: false,
      logs: [],
      loading: false,
    }),
}));

/**
 * Subscribe to execution IPC events for a project.
 */
export function bindExecutionEvents(projectId: WorkspaceId): () => void {
  const store = useExecutionStore.getState();

  const offStarted = on('execution.started', (event) => {
    if (event.workspaceId !== projectId) return;
    store.appendLog({
      timestamp: Date.now(),
      message: `Run ${event.payload.runId} started`,
      type: 'info',
    });
    void store.refreshRun(event.payload.runId);
  });

  const offStep = on('execution.step.event', (event) => {
    if (event.workspaceId !== projectId) return;
    const { type, stepId, errorMessage } = event.payload;
    store.appendLog({
      timestamp: Date.now(),
      message:
        type === 'step.failed'
          ? `Step ${stepId} failed${errorMessage ? `: ${errorMessage}` : ''}`
          : `Step ${stepId} — ${type.replace('step.', '')}`,
      type: type === 'step.failed' ? 'error' : type === 'step.passed' ? 'success' : 'step',
    });
    if (store.activeRunId === event.payload.runId) {
      void store.refreshRun(event.payload.runId);
    }
  });

  const offCompleted = on('execution.completed', (event) => {
    if (event.workspaceId !== projectId) return;
    store.appendLog({
      timestamp: Date.now(),
      message: `Run completed — ${event.payload.outcome}`,
      type: event.payload.outcome === 'passed' ? 'success' : 'error',
    });
    useExecutionStore.setState({ running: false });
    void store.refreshRun(event.payload.runId);
    void store.loadRuns(projectId);
  });

  const offClassified = on('execution.classified', (event) => {
    if (event.workspaceId !== projectId) return;
    store.appendLog({
      timestamp: Date.now(),
      message: `Classification: ${event.payload.summary}`,
      type: 'info',
    });
  });

  return () => {
    offStarted();
    offStep();
    offCompleted();
    offClassified();
  };
}
