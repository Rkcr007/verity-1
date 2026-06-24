import { create } from 'zustand';
import type { WorkspaceId } from '@verity/core';
import type { FileNode, ReadRepositoryFileResponse } from '@verity/core/ipc';
import { invoke } from '../ipc/client.js';

function collectDefaultExpanded(nodes: readonly FileNode[], depth = 0): Set<string> {
  const expanded = new Set<string>();
  if (depth > 1) return expanded;
  for (const node of nodes) {
    if (node.type === 'directory') {
      expanded.add(node.path);
      for (const child of collectDefaultExpanded(node.children ?? [], depth + 1)) {
        expanded.add(child);
      }
    }
  }
  return expanded;
}

interface WorkspaceExplorerState {
  fileTree: readonly FileNode[];
  treeLoading: boolean;
  treeError: string | null;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  filePreview: ReadRepositoryFileResponse | null;
  fileLoading: boolean;
  fileError: string | null;
  loadFileTree: (projectId: WorkspaceId) => Promise<void>;
  ensureAnalysis: (projectId: WorkspaceId) => Promise<void>;
  toggleExpanded: (path: string) => void;
  selectFile: (projectId: WorkspaceId, path: string) => Promise<void>;
  clearFileSelection: () => void;
  reset: () => void;
}

export const useWorkspaceExplorer = create<WorkspaceExplorerState>((set, get) => ({
  fileTree: [],
  treeLoading: false,
  treeError: null,
  expandedPaths: new Set<string>(),
  selectedPath: null,
  filePreview: null,
  fileLoading: false,
  fileError: null,

  loadFileTree: async (projectId) => {
    set({ treeLoading: true, treeError: null });
    try {
      const fileTree = await invoke('intelligence:get-file-tree', { projectId });
      const expandedPaths = collectDefaultExpanded(fileTree);
      set({ fileTree, expandedPaths, treeLoading: false });
    } catch (error) {
      set({
        treeLoading: false,
        treeError: error instanceof Error ? error.message : 'Failed to load file tree',
      });
    }
  },

  ensureAnalysis: async (projectId) => {
    try {
      const index = await invoke('intelligence:get-index', { projectId });
      if (index.version === 0) {
        await invoke('intelligence:start-analysis', { projectId });
      }
    } catch {
      // Analysis is best-effort; live file tree still renders without index cache.
    }
  },

  toggleExpanded: (path) => {
    const next = new Set(get().expandedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    set({ expandedPaths: next });
  },

  selectFile: async (projectId, path) => {
    set({ selectedPath: path, fileLoading: true, fileError: null, filePreview: null });
    try {
      const filePreview = await invoke('repository:read-file', { projectId, relativePath: path });
      set({ filePreview, fileLoading: false });
    } catch (error) {
      set({
        fileLoading: false,
        fileError: error instanceof Error ? error.message : 'Failed to read file',
      });
    }
  },

  clearFileSelection: () => {
    set({ selectedPath: null, filePreview: null, fileLoading: false, fileError: null });
  },

  reset: () => {
    set({
      fileTree: [],
      treeLoading: false,
      treeError: null,
      expandedPaths: new Set<string>(),
      selectedPath: null,
      filePreview: null,
      fileLoading: false,
      fileError: null,
    });
  },
}));
