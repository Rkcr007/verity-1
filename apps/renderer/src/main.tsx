import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './AppShell.js';
import './theme/tokens.css';

/**
 * Renderer entry. Mounts the React tree into #root. The renderer holds no
 * business logic — it talks to the main process exclusively through the typed
 * IPC client (architecture §2.2).
 */
const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
