import { app, BrowserWindow, dialog, shell } from 'electron';
import { join } from 'node:path';
import { VerityError } from '@verity/core';
import type { ServiceContainer } from './service-container.js';
import { buildElectronContainer } from './container.js';
import { IPCRouter } from './ipc-router.js';
import { IPCForwarder, type DomainEventBus } from './event-bus.js';
import { registerHandlers } from './register-handlers.js';
import { registerStubHandlers } from './register-stub-handlers.js';
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

app.setName('Verity');

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
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 14, y: 18 },
        }
      : { titleBarStyle: 'default' as const }),
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
    // DevTools are opt-in: set VERITY_OPEN_DEVTOOLS=1 when launching.
    if (process.env.VERITY_OPEN_DEVTOOLS === '1') {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

function warmUpDatabase(serviceContainer: ServiceContainer): void {
  serviceContainer.resolve(Tokens.ProjectService).list();
  if (isDev) {
    const dbPath = join(app.getPath('userData'), 'verity.db');
    console.info(`[verity] database ready at ${dbPath}`);
  }
}

async function bootstrap(): Promise<void> {
  try {
    container = await buildElectronContainer();
    warmUpDatabase(container);

    router = new IPCRouter();
    registerHandlers(router, container);
    registerStubHandlers(router);

    const bus = container.resolve(Tokens.EventBus);
    createWindow(bus);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(bus);
    });
  } catch (error) {
    console.error('[verity] bootstrap failed:', error);
    const message =
      error instanceof VerityError
        ? error.userMessage
        : error instanceof Error
          ? error.message
          : 'Unexpected startup error.';
    const detail = error instanceof VerityError ? error.detail : undefined;
    dialog.showErrorBox(
      'Verity could not start',
      detail ? `${message}\n\n${detail}` : message,
    );
    app.quit();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  void app.whenReady().then(bootstrap);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  forwarder?.stop();
  router?.dispose();
  await container?.dispose();
});
