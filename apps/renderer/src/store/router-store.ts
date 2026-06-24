import { create } from 'zustand';

/**
 * Route state (architecture §2.2). The shell is a desktop app with a fixed set
 * of top-level routes matching the locked screen inventory.
 */
export type Route =
  | 'welcome'
  | 'create'
  | 'workspace'
  | 'projects'
  | 'executions'
  | 'memory'
  | 'settings';

/** Create wizard entry path (M1.5). */
export type WizardMode = 'existing' | 'greenfield' | 'migrate';

interface RouterState {
  route: Route;
  wizardMode: WizardMode;
  go: (route: Route) => void;
  startCreate: (mode: WizardMode) => void;
}

export const useRouter = create<RouterState>((set) => ({
  route: 'welcome',
  wizardMode: 'existing',
  go: (route) => set({ route }),
  startCreate: (mode) => set({ route: 'create', wizardMode: mode }),
}));
