import { create } from 'zustand';

/**
 * Route state (architecture §2.2). The shell is a desktop app with a fixed set
 * of top-level routes matching the locked screen inventory; a lightweight store
 * is sufficient and avoids pulling in a URL router.
 */
export type Route =
  | 'welcome'
  | 'create'
  | 'workspace'
  | 'projects'
  | 'executions'
  | 'memory'
  | 'settings';

interface RouterState {
  route: Route;
  go: (route: Route) => void;
}

export const useRouter = create<RouterState>((set) => ({
  route: 'welcome',
  go: (route) => set({ route }),
}));
