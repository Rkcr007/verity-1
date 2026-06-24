import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import type { ServiceContainer } from './service-container.js';
import { buildContainer } from './container.js';
import { IPCRouter } from './ipc-router.js';
import { IPCForwarder, type DomainEventBus } from './event-bus.js';
import { registerHandlers } from './register-handlers.js';
import { Tokens } from './tokens.js';

/**
 * Electron main entry (architecture §1.1, §2.1, §10).
 *
 * Bootstraps the service container, IPC router, and event forwarding, then
 * creates the single application window with the locked security posture
 * (§10.2): contextIsolation on, nodeIntegration off, sandbox on.
 */

const DEV_SERVER_URL = process.env.VERITY_RENDERER_URL ?? 'http://localhost:5173';
const isDev = !app.isPackaged;

let container: ServiceContainer | null = null;
let router: IPCRouter | null = null;
let forwarder: IPCForwarder | null = null;

function createWindow(bus: DomainEventBus): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    backgroundColor: '#0A0C10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  // External links open in the user's browser, never in-app (§10.2).
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  forwarder = new IPCForwarder(bus, window.webContents);
  forwarder.start();

  if (isDev) {
    void window.loadURL(DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

async function bootstrap(): Promise<void> {
  container = buildContainer();
  router = new IPCRouter();
  registerHandlers(router, container);

  const bus = container.resolve(Tokens.EventBus);
  createWindow(bus);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(bus);
  });
}

void app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  forwarder?.stop();
  router?.dispose();
  await container?.dispose();
});
