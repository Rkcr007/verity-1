import { useEffect } from 'react';
import { ActivityRail } from './components/ActivityRail.js';
import { TitleBarDragRegion } from './components/ChromeHomeButton.js';
import { usePlatformChrome } from './hooks/use-platform-chrome.js';
import { useRouter } from './store/router-store.js';
import { useProjects } from './store/project-store.js';
import { VerityError } from '@verity/core';
import { invoke, on } from './ipc/client.js';
import { useToast } from './store/toast-store.js';
import { ToastHost } from './components/ToastHost.js';
import { WelcomeScreen } from './screens/Welcome/WelcomeScreen.js';
import { WorkspaceScreen } from './screens/Workspace/WorkspaceScreen.js';
import { ProjectsScreen } from './screens/Projects/ProjectsScreen.js';
import { CreateProjectScreen } from './screens/Create/CreateProjectScreen.js';
import { MemoryScreen } from './screens/Memory/MemoryScreen.js';
import { SettingsScreen } from './screens/Settings/SettingsScreen.js';
import { ExecutionsScreen } from './screens/Executions/ExecutionsScreen.js';

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
  const projectError = useProjects((s) => s.error);
  const toast = useToast((s) => s.show);

  useEffect(() => {
    void (async () => {
      try {
        await invoke('app:ping', undefined);
      } catch (error) {
        const message =
          error instanceof VerityError
            ? error.userMessage
            : error instanceof Error
              ? error.message
              : 'Backend unavailable';
        toast(message, 'err');
        return;
      }
      await loadProjects();
    })();
    const offCreated = on('project.created', () => void loadProjects());
    const offOpened = on('project.opened', () => void loadProjects());
    return () => {
      offCreated();
      offOpened();
    };
  }, [loadProjects, toast]);

  useEffect(() => {
    if (projectError) toast(projectError, 'err');
  }, [projectError, toast]);

  const showChrome = CHROME_ROUTES.has(route);
  const { isMac } = usePlatformChrome();

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', background: 'var(--bg0)', position: 'relative' }}>
      {showChrome && isMac ? <TitleBarDragRegion /> : null}
      {showChrome && <ActivityRail />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {route === 'welcome' && <WelcomeScreen />}
        {route === 'create' && <CreateProjectScreen />}
        {route === 'workspace' && <WorkspaceScreen project={active} />}
        {route === 'projects' && <ProjectsScreen />}
        {route === 'executions' && <ExecutionsScreen project={active} />}
        {route === 'memory' && <MemoryScreen project={active} />}
        {route === 'settings' && <SettingsScreen project={active} />}
      </div>
      <ToastHost />
    </div>
  );
}
