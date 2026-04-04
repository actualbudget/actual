/**
 * Tauri preload script — replaces Electron's preload.ts
 *
 * This file is loaded as a regular script in the Tauri webview.
 * It exposes the same `window.Actual` API that the rest of the app expects,
 * implemented via Tauri's `invoke` (for commands) and `listen`/`emit` (for events).
 */
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type { IpcClient } from '@actual-app/core/typings/window';

type BootstrapData = {
  version: string;
  isDev: boolean;
};

// Fetch bootstrap data synchronously-ish at module load time.
// We cache the result and serve it to consumers.
let bootstrapData: BootstrapData = {
  version: '0.0.0',
  isDev: false,
};

// Initialize bootstrap data
void invoke<BootstrapData>('get_bootstrap_data').then(data => {
  bootstrapData = data;
  globalThis.Actual.IS_DEV = data.isDev;
  globalThis.Actual.ACTUAL_VERSION = data.version;
});

globalThis.Actual = {
  IS_DEV: bootstrapData.isDev,
  ACTUAL_VERSION: bootstrapData.version,

  logToTerminal: (...args: unknown[]) => {
    console.log(...args);
  },

  ipcConnect: (func: (client: IpcClient) => void) => {
    // Set up bidirectional message channel via Tauri events.
    // The sidecar sends messages which Rust relays as 'message' events.
    // The frontend sends messages via the 'relay_message' command.
    func({
      on(name: string, handler: (...args: unknown[]) => void) {
        void listen(name, event => {
          handler(event.payload);
        });
        // Also listen on the generic 'message' channel for sidecar relay
        if (name === 'message') {
          void listen('message', event => {
            handler(event.payload);
          });
        }
        // Return a compatible EventEmitter-like object
        // oxlint-disable-next-line no-empty-function
        return { on: () => {}, emit: () => {} } as never;
      },
      emit(name: string, data: unknown) {
        void invoke('relay_message', { name, args: data });
      },
    });
  },

  startSyncServer: () => invoke('start_sync_server'),
  stopSyncServer: () => invoke('stop_sync_server'),
  isSyncServerRunning: () => invoke<boolean>('is_sync_server_running'),
  startOAuthServer: () => invoke<string>('start_oauth_server'),

  relaunch: () => {
    void invoke('relaunch');
  },

  restartElectronServer: () => {
    void invoke('restart_server');
  },

  openFileDialog: (opts: {
    properties?: Array<'openFile' | 'openDirectory'>;
    filters?: { name: string; extensions: string[] }[];
  }) => {
    return invoke<string[]>('open_file_dialog', { opts });
  },

  saveFile: async (
    contents: string | Buffer,
    filename: string,
    dialogTitle?: string,
  ) => {
    // Convert string contents to Uint8Array for Tauri
    let fileContents: number[];
    if (typeof contents === 'string') {
      fileContents = Array.from(new TextEncoder().encode(contents));
    } else {
      fileContents = Array.from(new Uint8Array(contents));
    }
    await invoke('save_file_dialog', {
      title: dialogTitle,
      defaultPath: filename,
      fileContents,
    });
  },

  openURLInBrowser: (url: string) => {
    void invoke('open_external_url', { url });
  },

  openInFileManager: (filepath: string) => {
    void invoke('open_in_file_manager', { filepath });
  },

  onEventFromMain: (type: string, handler: (...args: unknown[]) => void) => {
    void listen(type, event => handler(event.payload));
  },

  // No auto-updates in the Tauri app (handled by platform package managers)
  isUpdateReadyForDownload: () => false,
  waitForUpdateReadyForDownload: () =>
    new Promise<void>(() => {
      // Pending forever — no auto-update in Tauri
    }),

  getServerSocket: async () => {
    return null;
  },

  setTheme: (theme: string) => {
    void invoke('set_theme', { theme });
  },

  moveBudgetDirectory: (
    currentBudgetDirectory: string,
    newDirectory: string,
  ) => {
    return invoke('move_budget_directory', {
      from: currentBudgetDirectory,
      to: newDirectory,
    });
  },

  reload: async () => {
    throw new Error('Reload not implemented in Tauri app');
  },

  applyAppUpdate: async () => {
    throw new Error('applyAppUpdate not implemented in Tauri app');
  },
} satisfies typeof globalThis.Actual;
