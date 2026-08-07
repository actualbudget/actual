import { app, ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // check again every 6 hours

let isUpdateDownloaded = false;

// In-app updates only make sense for builds installed directly from a GitHub
// release (NSIS exe, dmg, AppImage). Store-distributed builds update through
// their store instead: the Microsoft Store build (appx) reports
// process.windowsStore, and the Flathub build runs inside a flatpak sandbox.
export function isAutoUpdateSupported(): boolean {
  if (!app.isPackaged || process.env.EXECUTION_CONTEXT === 'playwright') {
    return false;
  }

  switch (process.platform) {
    case 'win32':
      return !process.windowsStore;
    case 'linux':
      // electron-updater can only replace the AppImage it was launched from
      return (
        !process.env.FLATPAK_ID &&
        process.env.container !== 'flatpak' &&
        Boolean(process.env.APPIMAGE)
      );
    case 'darwin':
      return true;
    default:
      return false;
  }
}

export function getIsUpdateDownloaded(): boolean {
  return isUpdateDownloaded;
}

type InitAutoUpdaterOptions = {
  getClientWindow: () => BrowserWindow | null;
  isAutoUpdateEnabled: () => Promise<boolean>;
  log: (loglevel: 'info' | 'error', message: string) => void;
};

export function initAutoUpdater({
  getClientWindow,
  isAutoUpdateEnabled,
  log,
}: InitAutoUpdaterOptions) {
  ipcMain.handle('apply-app-update', () => {
    if (isUpdateDownloaded) {
      autoUpdater.quitAndInstall();
    }
  });

  if (!isAutoUpdateSupported()) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', info => {
    isUpdateDownloaded = true;
    log('info', `Auto-update: version ${info.version} downloaded`);
    getClientWindow()?.webContents.send('update-downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', error => {
    // A failed update must never break the running app - just log it
    log('error', `Auto-update: ${String(error)}`);
  });

  const checkForUpdates = async () => {
    if (!(await isAutoUpdateEnabled())) {
      return;
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log('error', `Auto-update: check failed: ${String(error)}`);
    }
  };

  void checkForUpdates();
  setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL);
}
