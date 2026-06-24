import { useEffect } from 'react';
import { ActivityRail } from './components/ActivityRail.js';
import { useRouter } from './store/router-store.js';
import { useProjects } from './store/project-store.js';
import { on } from './ipc/client.js';
import { ToastHost } from './components/ToastHost.js';
import { WelcomeScreen } from './screens/Welcome/WelcomeScreen.js';
import { WorkspaceScreen } from './screens/Workspace/WorkspaceScreen.js';
import { ProjectsScreen } from './screens/Projects/ProjectsScreen.js';
import { CreateProjectScreen } from './screens/Create/CreateProjectScreen.js';
import { MemoryScreen } from './screens/Memory/MemoryScreen.js';
import { PlaceholderScreen } from './screens/PlaceholderScreen.js';

/**
 * AppShell (architecture §2.2). Root layout + router. Shows the ActivityRail on
 * chrome screens, mounts the active screen, and subscribes to domain events so
 * the project cache stays in sync with the backend (architecture §6.3).
 */
const CHROME_ROUTES = new Set(['workspace', 'projects', 'executions', 'memory', 'settings']);

export function AppShell() {
  const route = useRouter((s) => s.route);
  const active = useProjects((s) => s.active);
  const loadProjects = useProjects((s) => s.loadProjects);

  useEffect(() => {
    void loadProjects();
    const offCreated = on('project.created', () => void loadProjects());
    const offOpened = on('project.opened', () => void loadProjects());
    return () => {
      offCreated();
      offOpened();
    };
  }, [loadProjects]);

  const showChrome = CHROME_ROUTES.has(route);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', background: 'var(--bg0)' }}>
      {showChrome && <ActivityRail />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {route === 'welcome' && <WelcomeScreen />}
        {route === 'create' && <CreateProjectScreen />}
        {route === 'workspace' && <WorkspaceScreen project={active} />}
        {route === 'projects' && <ProjectsScreen />}
        {route === 'executions' && <PlaceholderScreen title="Executions" epic="EPIC 5 (M5)" />}
        {route === 'memory' && <MemoryScreen project={active} />}
        {route === 'settings' && <PlaceholderScreen title="Settings" epic="EPIC 3 (M3)" />}
      </div>
      <ToastHost />
    </div>
  );
}
