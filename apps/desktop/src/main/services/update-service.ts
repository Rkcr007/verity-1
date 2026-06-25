import { app } from 'electron';
import type { AppUpdateStatusDto } from '@verity/core/ipc';

export interface IUpdateService {
  init(): void;
  getStatus(): AppUpdateStatusDto;
  checkForUpdates(): Promise<AppUpdateStatusDto>;
  downloadUpdate(): Promise<AppUpdateStatusDto>;
  installUpdate(): void;
}

/**
 * Wraps electron-updater for packaged builds; returns unavailable in development.
 */
export class UpdateService implements IUpdateService {
  private status: AppUpdateStatusDto = {
    state: 'unavailable',
    message: 'Updates are disabled in development builds',
  };

  init(): void {
    if (!app.isPackaged) return;
    void this.setupAutoUpdater();
  }

  getStatus(): AppUpdateStatusDto {
    return this.status;
  }

  async checkForUpdates(): Promise<AppUpdateStatusDto> {
    if (!app.isPackaged) return this.status;
    try {
      const { autoUpdater } = await import('electron-updater');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.status = {
        state: 'error',
        message: error instanceof Error ? error.message : 'Update check failed',
      };
    }
    return this.status;
  }

  async downloadUpdate(): Promise<AppUpdateStatusDto> {
    if (!app.isPackaged) return this.status;
    try {
      const { autoUpdater } = await import('electron-updater');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.status = {
        state: 'error',
        message: error instanceof Error ? error.message : 'Download failed',
      };
    }
    return this.status;
  }

  installUpdate(): void {
    if (!app.isPackaged) return;
    void import('electron-updater').then(({ autoUpdater }) => {
      autoUpdater.quitAndInstall();
    });
  }

  private async setupAutoUpdater(): Promise<void> {
    try {
      const { autoUpdater } = await import('electron-updater');
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.on('checking-for-update', () => {
        this.status = { state: 'checking' };
      });

      autoUpdater.on('update-available', (info) => {
        this.status = {
          state: 'available',
          version: info.version,
          message: `Verity ${info.version} is available`,
        };
      });

      autoUpdater.on('update-not-available', () => {
        this.status = { state: 'idle', message: 'You are on the latest version' };
      });

      autoUpdater.on('download-progress', (progress) => {
        this.status = {
          state: 'downloading',
          progress: progress.percent,
          message: `Downloading update… ${Math.round(progress.percent)}%`,
          ...(this.status.version ? { version: this.status.version } : {}),
        };
      });

      autoUpdater.on('update-downloaded', (info) => {
        this.status = {
          state: 'ready',
          version: info.version,
          message: `Verity ${info.version} is ready to install`,
        };
      });

      autoUpdater.on('error', (error) => {
        this.status = {
          state: 'error',
          message: error.message,
        };
      });

      this.status = { state: 'idle' };
      void autoUpdater.checkForUpdates();
    } catch (error) {
      this.status = {
        state: 'unavailable',
        message: error instanceof Error ? error.message : 'Update service unavailable',
      };
    }
  }
}
