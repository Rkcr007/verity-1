import { create } from 'zustand';
import type { Project } from '@verity/core';
import { invoke } from '../ipc/client.js';

/**
 * Project store (architecture §2.2). Holds the project list and the active
 * project. All mutations go through IPC; the store is a cache of backend state,
 * never an independent source of truth.
 */
interface ProjectState {
  projects: Project[];
  active: Project | null;
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  openProject: (id: Project['id']) => Promise<void>;
  setActive: (project: Project) => void;
}

export const useProjects = create<ProjectState>((set) => ({
  projects: [],
  active: null,
  loading: false,
  error: null,

  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await invoke('project:list', undefined);
      set({ projects, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Failed to load' });
    }
  },

  openProject: async (id) => {
    try {
      const project = await invoke('project:open', { projectId: id });
      set({ active: project });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to open project' });
    }
  },

  setActive: (project) => set({ active: project }),
}));
