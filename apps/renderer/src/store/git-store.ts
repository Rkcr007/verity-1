import { create } from 'zustand';
import type { ProposalId, WorkspaceId } from '@verity/core';
import type {
  DiffLineDto,
  GitChangeDto,
  GitStatusDto,
  SemanticProposalDto,
} from '@verity/core/ipc';
import { invoke, on } from '../ipc/client.js';

export interface GitActivityEntry {
  readonly timestamp: number;
  readonly message: string;
  readonly type: 'info' | 'success' | 'error';
}

interface GitState {
  status: GitStatusDto | null;
  loading: boolean;
  error: string | null;
  activity: readonly GitActivityEntry[];
  commitModalOpen: boolean;
  selectedDiffPath: string | null;
  diffLines: readonly DiffLineDto[];
  diffLoading: boolean;
  committing: boolean;
  pushError: string | null;
  commitSucceeded: boolean;
  lastProposal: SemanticProposalDto | null;
  loadStatus: (projectId: WorkspaceId) => Promise<void>;
  loadDiff: (projectId: WorkspaceId, path: string) => Promise<void>;
  checkoutBranch: (projectId: WorkspaceId, branch: string, create?: boolean) => Promise<void>;
  openCommitModal: (path?: string) => void;
  closeCommitModal: () => void;
  commitAndPush: (projectId: WorkspaceId, message: string, files: readonly string[]) => Promise<void>;
  appendActivity: (entry: GitActivityEntry) => void;
  reset: () => void;
}

function enrichChanges(
  changes: readonly GitChangeDto[],
  proposal: SemanticProposalDto | null,
): readonly GitChangeDto[] {
  if (!proposal) return changes;
  const summaries = new Map(proposal.proposedFiles.map((file) => [file.path, file.summary]));
  return changes.map((change) => {
    const summary = summaries.get(change.path);
    return summary ? { ...change, summary } : change;
  });
}

export const useGitStore = create<GitState>((set, get) => ({
  status: null,
  loading: false,
  error: null,
  activity: [],
  commitModalOpen: false,
  selectedDiffPath: null,
  diffLines: [],
  diffLoading: false,
  committing: false,
  pushError: null,
  commitSucceeded: false,
  lastProposal: null,

  loadStatus: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const status = await invoke('git:get-status', { projectId });
      const proposal = get().lastProposal;
      set({
        status: {
          ...status,
          changes: enrichChanges(status.changes, proposal),
        },
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load git status',
      });
    }
  },

  loadDiff: async (projectId, path) => {
    set({ diffLoading: true, selectedDiffPath: path });
    try {
      const { lines } = await invoke('git:get-diff', { projectId, path });
      set({ diffLines: lines, diffLoading: false });
    } catch {
      set({ diffLines: [], diffLoading: false });
    }
  },

  checkoutBranch: async (projectId, branch, create) => {
    set({ loading: true, error: null });
    try {
      const status = await invoke('git:checkout-branch', {
        projectId,
        branch,
        ...(create ? { create: true } : {}),
      });
      const proposal = get().lastProposal;
      set({
        status: {
          ...status,
          changes: enrichChanges(status.changes, proposal),
        },
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Could not switch branches',
      });
      throw error;
    }
  },

  openCommitModal: (path) => {
    const firstPath = path ?? get().status?.changes[0]?.path ?? null;
    set({
      commitModalOpen: true,
      selectedDiffPath: firstPath,
      diffLines: [],
      pushError: null,
      commitSucceeded: false,
    });
  },

  closeCommitModal: () => {
    set({
      commitModalOpen: false,
      selectedDiffPath: null,
      diffLines: [],
      diffLoading: false,
      pushError: null,
      commitSucceeded: false,
    });
  },

  commitAndPush: async (projectId, message, files) => {
    set({ committing: true, pushError: null, commitSucceeded: false });
    try {
      await invoke('git:commit', { projectId, message, files });
      set({ commitSucceeded: true });
      try {
        await invoke('git:push', { projectId });
        set({
          committing: false,
          commitModalOpen: false,
          selectedDiffPath: null,
          diffLines: [],
          pushError: null,
          commitSucceeded: false,
        });
        await get().loadStatus(projectId);
      } catch (pushError) {
        set({
          committing: false,
          pushError:
            pushError instanceof Error
              ? pushError.message
              : 'Push rejected — the remote branch has newer commits.',
        });
        await get().loadStatus(projectId);
      }
    } catch (error) {
      set({ committing: false, commitSucceeded: false });
      throw error;
    }
  },

  appendActivity: (entry) => {
    set((state) => ({ activity: [...state.activity, entry] }));
  },

  reset: () =>
    set({
      status: null,
      loading: false,
      error: null,
      activity: [],
      commitModalOpen: false,
      selectedDiffPath: null,
      diffLines: [],
      diffLoading: false,
      committing: false,
      pushError: null,
      commitSucceeded: false,
      lastProposal: null,
    }),
}));

/**
 * Subscribe to git IPC events for a workspace.
 */
export function bindGitEvents(
  projectId: WorkspaceId,
  onToast: (message: string, tone?: 'ok' | 'err' | 'info') => void,
): () => void {
  const store = useGitStore.getState();

  const offStatus = on('git.status.changed', (event) => {
    if (event.payload.projectId !== projectId) return;
    void store.loadStatus(projectId);
  });

  const offCommitted = on('git.committed', (event) => {
    if (event.payload.projectId !== projectId) return;
    store.appendActivity({
      timestamp: Date.now(),
      message: `Committed ${event.payload.fileCount} file(s): ${event.payload.message}`,
      type: 'success',
    });
  });

  const offPushed = on('git.pushed', (event) => {
    if (event.payload.projectId !== projectId) return;
    store.appendActivity({
      timestamp: Date.now(),
      message: `✓ Pushed to origin/${event.payload.branch}`,
      type: 'success',
    });
    onToast(`Committed & pushed to origin/${event.payload.branch}`);
  });

  const offPushFailed = on('git.push.failed', (event) => {
    if (event.payload.projectId !== projectId) return;
    store.appendActivity({
      timestamp: Date.now(),
      message: event.payload.reason,
      type: 'error',
    });
  });

  const offProposalApplied = on('semantic.proposal.applied', (event) => {
    if (event.payload.projectId !== projectId) return;
    void (async () => {
      try {
        const proposal = await invoke('semantic:get-proposal', {
          projectId,
          proposalId: event.payload.proposalId as ProposalId,
        });
        useGitStore.setState({ lastProposal: proposal });
        await store.loadStatus(projectId);
        onToast('Applied — review in Git Changes');
      } catch {
        await store.loadStatus(projectId);
        onToast('Applied — review in Git Changes');
      }
    })();
  });

  return () => {
    offStatus();
    offCommitted();
    offPushed();
    offPushFailed();
    offProposalApplied();
  };
}
