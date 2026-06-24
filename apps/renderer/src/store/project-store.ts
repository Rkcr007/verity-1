import { create } from 'zustand';
import type { CreateProjectInput, Project } from '@verity/core';
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
  createDraft: (name: string) => Promise<Project>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  openProject: (id: Project['id']) => Promise<Project>;
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

  createDraft: async (name) => {
    const project = await invoke('project:create-draft', { name });
    set((state) => ({
      projects: [project, ...state.projects],
      active: project,
      error: null,
    }));
    return project;
  },

  createProject: async (input) => {
    const project = await invoke('project:create', input);
    set((state) => ({
      projects: [project, ...state.projects],
      active: project,
      error: null,
    }));
    return project;
  },

  openProject: async (id) => {
    const project = await invoke('project:open', { projectId: id });
    set({ active: project, error: null });
    return project;
  },

  setActive: (project) => set({ active: project }),
}));
