import fs from 'fs';
import { createServer } from 'http';
import type { Server } from 'http';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'path';

import type { GlobalPrefsJson } from '@actual-app/core/types/prefs';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  powerMonitor,
  protocol,
  shell,
  utilityProcess,
} from 'electron';
import type {
  Env,
  ForkOptions,
  OpenDialogSyncOptions,
  SaveDialogOptions,
  UtilityProcess,
} from 'electron';

import { getMenu } from './menu';
import { retry as promiseRetry } from './retry';
import type { AppInitFailurePayload } from './server';
import {
  get as getWindowState,
  listen as listenToWindowState,
} from './window-state';
import './security';

const BUILD_ROOT = `${__dirname}/..`;

const isPlaywrightTest = process.env.EXECUTION_CONTEXT === 'playwright';
const isDev = !isPlaywrightTest && !app.isPackaged; // dev mode if not packaged and not playwright

process.env.lootCoreScript = isDev
  ? '@actual-app/core/lib-dist/electron/bundle.desktop.js' // serve from local output in development (provides hot-reloading)
  : path.resolve(BUILD_ROOT, 'loot-core/lib-dist/electron/bundle.desktop.js'); // serve from build in production

// This allows relative URLs to be resolved to app:// which makes
// local assets load correctly
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true } },
]);

if (isPlaywrightTest) {
  if (!process.env.ACTUAL_DOCUMENT_DIR || !process.env.ACTUAL_DATA_DIR) {
    throw new Error(
      'ACTUAL_DOCUMENT_DIR and ACTUAL_DATA_DIR must be set in the environment for playwright tests',
    );
  }
} else {
  if (!isDev || !process.env.ACTUAL_DOCUMENT_DIR) {
    process.env.ACTUAL_DOCUMENT_DIR = app.getPath('documents');
  }

  if (!isDev || !process.env.ACTUAL_DATA_DIR) {
    process.env.ACTUAL_DATA_DIR = app.getPath('userData');
  }
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let clientWin: BrowserWindow | null;
let serverProcess: UtilityProcess | null;
let syncServerProcess: UtilityProcess | null;

// The last startup failure reported by (or observed on) the backend process.
// Kept so a renderer that connects after the failure was posted still gets
// told about it instead of waiting forever for a reply.
let lastAppInitFailure: AppInitFailurePayload | null = null;

let oAuthServer: ReturnType<typeof createServer> | null;

let queuedClientWinLogs: string[] = []; // logs that are queued up until the client window is ready

const logMessage = (loglevel: 'info' | 'error', message: string) => {
  // Electron main process logs
  const trimmedMessage = JSON.stringify(message.trim()); // ensure line endings are removed
  console[loglevel](trimmedMessage);

  if (!clientWin) {
    // queue up the logs until the client window is ready
    queuedClientWinLogs.push(`console.${loglevel}(${trimmedMessage})`);
  } else {
    // Send the queued up logs to the devtools console
    void clientWin.webContents.executeJavaScript(
      `console.${loglevel}(${trimmedMessage})`,
    );
  }
};

const createOAuthServer = async () => {
  const port = 3010;

  if (oAuthServer) {
    logMessage('info', `OAuth server is already running on port: ${port}`);

    return { url: `http://localhost:${port}`, server: oAuthServer };
  }

  return new Promise<{ url: string; server: Server }>(resolve => {
    const server = createServer(async (req, res) => {
      const query = new URL(req.url || '', `http://localhost:${port}`)
        .searchParams;

      const code = query.get('token');
      if (code && clientWin) {
        if (isDev) {
          void clientWin.loadURL(
            `http://localhost:3001/openid-cb?token=${code}`,
          );
        } else {
          void clientWin.loadURL(`app://actual/openid-cb?token=${code}`);
        }

        // Respond to the browser
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OpenID login successful! You can close this tab.');

        // Clean up the server after receiving the code. Wait for the listener
        // to fully release port 3010 before clearing the reference, otherwise a
        // subsequent start-oauth-server request could try to bind the port
        // while this listener is still shutting down.
        await new Promise<void>(closeResolve => {
          server.close(() => closeResolve());
        });
        oAuthServer = null;
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No token received.');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      logMessage('info', `OAuth server started on port: ${port}`);
      resolve({ url: `http://localhost:${port}`, server });
    });
  });
};

if (isDev) {
  process.traceProcessWarnings = true;
}

const getGlobalPrefsPath = () =>
  path.join(process.env.ACTUAL_DATA_DIR!, 'global-store.json');

async function loadGlobalPrefs() {
  let state: GlobalPrefsJson = {};
  try {
    state = JSON.parse(fs.readFileSync(getGlobalPrefsPath(), 'utf8'));
  } catch {
    logMessage('info', 'Could not load global state - using defaults');
    state = {};
  }

  return state;
}

// Like loadGlobalPrefs, but only a missing file falls back to defaults; a
// read or parse failure is propagated so callers doing read-modify-write don't
// overwrite a store they couldn't read.
async function loadGlobalPrefsStrict(): Promise<GlobalPrefsJson> {
  let contents: string;
  try {
    contents = await readFile(getGlobalPrefsPath(), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }

  const parsed: unknown = JSON.parse(contents);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Global preferences file is not a JSON object');
  }
  return parsed as GlobalPrefsJson;
}

// Writes the global preferences file atomically (temp file + rename), the same
// way loot-core's asyncStorage does. Only meant to be used while the backend
// process is not running, otherwise the two would race for the file.
async function saveGlobalPrefs(state: GlobalPrefsJson) {
  const globalPrefsPath = getGlobalPrefsPath();
  const temporaryPath = `${globalPrefsPath}.${process.pid}.main.tmp`;

  try {
    await writeFile(temporaryPath, JSON.stringify(state), 'utf8');
    await rename(temporaryPath, globalPrefsPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function reportAppInitFailure(payload: AppInitFailurePayload) {
  lastAppInitFailure = payload;
  logMessage('error', `Backend failed to start: ${payload.message}`);

  if (clientWin) {
    clientWin.webContents.send('message', payload);
  }
}

async function createBackgroundProcess() {
  lastAppInitFailure = null;

  const globalPrefs = await loadGlobalPrefs(); // ensures we have the latest settings - even when restarting the server
  let envVariables: Env = {
    ...process.env, // required
  };

  if (globalPrefs['server-self-signed-cert']) {
    envVariables = {
      ...envVariables,
      NODE_EXTRA_CA_CERTS: globalPrefs['server-self-signed-cert'], // add self signed cert to env - fetch can pick it up
    };
  }

  let forkOptions: ForkOptions = {
    stdio: 'pipe',
    env: envVariables,
  };

  if (isDev) {
    forkOptions = { ...forkOptions, execArgv: ['--inspect'] };
  }

  serverProcess = utilityProcess.fork(
    __dirname + '/server.js',
    ['--subprocess', app.getVersion()],
    forkOptions,
  );

  serverProcess.stdout?.on('data', (chunk: Buffer) => {
    // Send the Server log messages to the main browser window
    logMessage('info', `Server Log: ${chunk.toString('utf8')}`);
  });

  serverProcess.stderr?.on('data', (chunk: Buffer) => {
    // Send the Server log messages out to the main browser window
    logMessage('error', `Server Log: ${chunk.toString('utf8')}`);
  });

  const startedProcess = serverProcess;

  startedProcess.on('message', msg => {
    switch (msg.type) {
      case 'captureEvent':
      case 'captureBreadcrumb':
        break;
      case 'reply':
      case 'error':
      case 'push':
        if (clientWin) {
          clientWin.webContents.send('message', msg);
        }
        break;
      case 'app-init-failure':
        reportAppInitFailure(msg as AppInitFailurePayload);
        break;
      default:
        logMessage('info', 'Unknown server message: ' + msg.type);
    }
  });

  startedProcess.on('exit', code => {
    // `serverProcess` is cleared before an intentional kill (restart / quit),
    // so if it still points at this process the exit was unexpected.
    if (serverProcess !== startedProcess) {
      return;
    }
    serverProcess = null;

    // A failure that was already reported is more specific than "it exited".
    if (lastAppInitFailure) {
      return;
    }

    reportAppInitFailure({
      type: 'app-init-failure',
      BackendInitFailure: true,
      message: `The backend process exited unexpectedly (exit code ${code})`,
    });
  });
}

async function startSyncServer() {
  try {
    if (syncServerProcess) {
      logMessage(
        'info',
        'Sync-Server: Already started! Ignoring request to start.',
      );
      return;
    }

    const globalPrefs = await loadGlobalPrefs();

    const syncServerConfig = {
      port: globalPrefs.syncServerConfig?.port || 5007,
      hostname: '127.0.0.1',
      ACTUAL_SERVER_DATA_DIR: path.resolve(
        process.env.ACTUAL_DATA_DIR!,
        'actual-server',
      ),
      ACTUAL_SERVER_FILES: path.resolve(
        process.env.ACTUAL_DATA_DIR!,
        'actual-server',
        'server-files',
      ),
      ACTUAL_USER_FILES: path.resolve(
        process.env.ACTUAL_DATA_DIR!,
        'actual-server',
        'user-files',
      ),
    };

    // require.resolve will recursively search up the workspace for the module
    const syncServerRoot = path.dirname(
      require.resolve('@actual-app/sync-server/package.json'),
    );
    const serverPath = path.join(syncServerRoot, 'build/app.js');

    const webRoot = path.join(
      // require.resolve will recursively search up the workspace for the module
      path.dirname(require.resolve('@actual-app/web/package.json')),
      'build',
    );

    // Use env variables to configure the server
    const envVariables: Env = {
      ...process.env, // required
      ACTUAL_PORT: `${syncServerConfig.port}`,
      ACTUAL_HOSTNAME: `${syncServerConfig.hostname}`,
      ACTUAL_SERVER_FILES: `${syncServerConfig.ACTUAL_SERVER_FILES}`,
      ACTUAL_USER_FILES: `${syncServerConfig.ACTUAL_USER_FILES}`,
      ACTUAL_DATA_DIR: `${syncServerConfig.ACTUAL_SERVER_DATA_DIR}`,
      ACTUAL_WEB_ROOT: webRoot,
    };

    // ACTUAL_SERVER_DATA_DIR is the root directory for the sync-server
    if (!fs.existsSync(syncServerConfig.ACTUAL_SERVER_DATA_DIR)) {
      void mkdir(syncServerConfig.ACTUAL_SERVER_DATA_DIR, { recursive: true });
    }

    let forkOptions: ForkOptions = {
      stdio: 'pipe',
      env: envVariables,
    };

    if (isDev) {
      forkOptions = { ...forkOptions, execArgv: ['--inspect'] };
    }

    let syncServerStarted = false;

    const syncServerPromise = new Promise<void>(resolve => {
      syncServerProcess = utilityProcess.fork(serverPath, [], forkOptions);

      syncServerProcess.stdout?.on('data', (chunk: Buffer) => {
        // Send the Server console.log messages to the main browser window
        logMessage('info', `Sync-Server: ${chunk.toString('utf8')}`);
      });

      syncServerProcess.stderr?.on('data', (chunk: Buffer) => {
        // Send the Server console.error messages out to the main browser window
        logMessage('error', `Sync-Server: ${chunk.toString('utf8')}`);
      });

      syncServerProcess.on('message', msg => {
        switch (msg.type) {
          case 'server-started':
            logMessage('info', 'Sync-Server: Actual Sync Server has started!');
            syncServerStarted = true;
            resolve();
            break;
          default:
            logMessage(
              'info',
              'Sync-Server: Unknown server message: ' + msg.type,
            );
        }
      });
    });

    const SYNC_SERVER_WAIT_TIMEOUT = 20000; // wait 20 seconds for the server to start - if it doesn't, throw an error

    const syncServerTimeout = new Promise<void>((_, reject) => {
      setTimeout(() => {
        if (!syncServerStarted) {
          const errorMessage = `Sync-Server: Failed to start within ${SYNC_SERVER_WAIT_TIMEOUT / 1000} seconds. Something is wrong. Please raise a github issue.`;
          logMessage('error', errorMessage);
          reject(new Error(errorMessage));
        }
      }, SYNC_SERVER_WAIT_TIMEOUT);
    });

    return await Promise.race([syncServerPromise, syncServerTimeout]); // Either the server has started or the timeout is reached
  } catch (error) {
    logMessage(
      'error',
      `Sync-Server: Error starting sync server: ${String(error)}`,
    );
  }
}

async function stopSyncServer() {
  syncServerProcess?.kill();
  syncServerProcess = null;
  logMessage('info', 'Sync-Server: Stopped');
}

async function createWindow() {
  const windowState = await getWindowState();

  // Create the browser window.
  const win = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    title: 'Actual',
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      preload: __dirname + '/preload.js',
    },
    autoHideMenuBar: true, // Alt key shows the menu
  });

  win.setBackgroundColor('#E8ECF0');

  if (isPlaywrightTest) {
    // Append a 'playwright' marker to the default Electron userAgent so
    // navigator.userAgent-based checks in the renderer (Platform.isPlaywright,
    // environment.isElectron) both light up. Replacing the UA with bare
    // 'playwright' (as playwright.config.ts does for chromium launches) would
    // strip the 'Electron' substring that isElectron() relies on.
    win.webContents.setUserAgent(
      `${win.webContents.getUserAgent()} playwright`,
    );
  }

  if (isDev) {
    win.webContents.openDevTools();
  }

  const unlistenToState = listenToWindowState(win, windowState);

  if (isDev) {
    void win.loadURL(`file://${__dirname}/loading.html`);
    // Wait for the development server to start
    setTimeout(() => {
      void promiseRetry(retry =>
        win.loadURL('http://localhost:3001/').catch(retry),
      );
    }, 3000);
  } else {
    void win.loadURL(`app://actual/`);
  }

  win.on('closed', () => {
    clientWin = null;
    unlistenToState();
  });

  win.on('unresponsive', () => {
    logMessage(
      'info',
      'browser window went unresponsive (maybe because of a modal)',
    );
  });

  win.on('focus', async () => {
    if (clientWin) {
      const url = clientWin.webContents.getURL();
      if (url.includes('app://') || url.includes('localhost:')) {
        void clientWin.webContents.executeJavaScript(
          'window.__actionsForMenu.appFocused()',
        );
      }
    }
  });

  // hit when middle-clicking buttons or <a href/> with a target set to _blank
  // always deny, optionally redirect to browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  // hit when clicking <a href/> with no target
  // optionally redirect to browser
  win.webContents.on('will-navigate', (event, url) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
      event.preventDefault();
    }
  });

  Menu.setApplicationMenu(getMenu());

  clientWin = win;

  // Execute queued logs - displaying them in the client window
  void Promise.all(
    queuedClientWinLogs.map((log: string) =>
      win.webContents.executeJavaScript(log),
    ),
  );

  queuedClientWinLogs = [];
}

function isExternalUrl(url: string) {
  return !url.includes('localhost:') && !url.includes('app://');
}

app.setAppUserModelId('com.actualbudget.actual');

app.on('ready', async () => {
  // Install an `app://` protocol that always returns the base HTML
  // file no matter what URL it is. This allows us to use react-router
  // on the frontend

  const globalPrefs = await loadGlobalPrefs();

  if (globalPrefs.syncServerConfig?.autoStart) {
    // wait for the server to start before starting the Actual client to ensure server is available
    await startSyncServer();
  }

  protocol.handle('app', request => {
    if (request.method !== 'GET') {
      return new Response(null, {
        status: 405,
        statusText: 'Method Not Allowed',
      });
    }

    const parsedUrl = new URL(request.url);
    if (parsedUrl.protocol !== 'app:') {
      return new Response(null, {
        status: 404,
        statusText: 'Unknown URL Scheme',
      });
    }

    if (parsedUrl.host !== 'actual') {
      return new Response(null, {
        status: 404,
        statusText: 'Host Not Resolved',
      });
    }

    const pathname = parsedUrl.pathname;

    let filePath = path.normalize(`${BUILD_ROOT}/client-build/index.html`); // default web path

    if (pathname.startsWith('/static')) {
      // static assets
      filePath = path.normalize(`${BUILD_ROOT}/client-build${pathname}`);
      const resolvedPath = path.resolve(filePath);
      const clientBuildPath = path.resolve(BUILD_ROOT, 'client-build');

      // Ensure filePath is within client-build directory - prevents directory traversal vulnerability
      if (!resolvedPath.startsWith(clientBuildPath)) {
        return new Response(null, {
          status: 403,
          statusText: 'Forbidden',
        });
      }
    }

    return net.fetch(`file:///${filePath}`);
  });

  if (process.argv[1] !== '--server') {
    await createWindow();
  }

  // This is mainly to aid debugging Sentry errors - it will add a
  // breadcrumb
  powerMonitor.on('suspend', () => {
    logMessage('info', 'Suspending: ' + new Date());
  });

  await createBackgroundProcess();
});

app.on('window-all-closed', () => {
  // On macOS, closing all windows shouldn't exit the process
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    const processToKill = serverProcess;
    serverProcess = null;
    processToKill.kill();
  }
});

app.on('activate', () => {
  if (clientWin === null) {
    void createWindow();
  }
});

export type GetBootstrapDataPayload = {
  version: string;
  isDev: boolean;
};

ipcMain.on('get-bootstrap-data', event => {
  const payload: GetBootstrapDataPayload = {
    version: isPlaywrightTest ? '99.9.9' : app.getVersion(),
    isDev,
  };

  event.returnValue = payload;
});

ipcMain.handle('start-sync-server', async () => startSyncServer());

ipcMain.handle('stop-sync-server', async () => stopSyncServer());

ipcMain.handle('is-sync-server-running', async () =>
  syncServerProcess ? true : false,
);

ipcMain.handle('start-oauth-server', async () => {
  const { url, server: newServer } = await createOAuthServer();
  oAuthServer = newServer;
  return url;
});

ipcMain.handle('restart-server', () => {
  if (serverProcess) {
    const processToKill = serverProcess;
    serverProcess = null;
    processToKill.kill();
  }

  void createBackgroundProcess();
});

// Lets the user pick a new budget data folder from the startup error screen,
// when the backend (which normally owns the global preferences) is not
// running. The app is relaunched by the renderer afterwards.
ipcMain.handle('set-document-dir', async (_event, directory: string) => {
  if (!directory) {
    throw new Error('A directory must be provided');
  }

  if (!fs.existsSync(directory)) {
    throw new Error(`The directory does not exist: ${directory}`);
  }

  // Probe that we can actually create something inside the chosen folder.
  // Permission checks alone don't catch things like Windows Controlled Folder
  // Access, which blocks writes without changing the folder's permissions.
  const probePrefix = path.join(directory, '.actual-write-test-');
  let probeDirectory: string;
  try {
    probeDirectory = await mkdtemp(probePrefix);
  } catch (error) {
    throw new Error(
      `Actual is not allowed to create files in ${directory}: ${String(error)}`,
    );
  }
  await rm(probeDirectory, { recursive: true, force: true }).catch(
    () => undefined,
  );

  // Strict read: a corrupt or unreadable store must not be silently replaced
  // by `{ document-dir }`, which would wipe the user's other preferences.
  const globalPrefs = await loadGlobalPrefsStrict();
  await saveGlobalPrefs({ ...globalPrefs, 'document-dir': directory });
  logMessage('info', `Budget data folder changed to: ${directory}`);
});

ipcMain.handle('relaunch', () => {
  app.relaunch();
  app.exit();
});

export type OpenFileDialogPayload = {
  properties?: OpenDialogSyncOptions['properties'];
  filters?: OpenDialogSyncOptions['filters'];
};

ipcMain.handle(
  'open-file-dialog',
  (_event, { filters, properties }: OpenFileDialogPayload) => {
    return dialog.showOpenDialogSync({
      properties: properties || ['openFile'],
      filters,
    });
  },
);

export type SaveFileDialogPayload = {
  title: SaveDialogOptions['title'];
  defaultPath?: SaveDialogOptions['defaultPath'];
  fileContents: string | Buffer;
};

ipcMain.handle(
  'save-file-dialog',
  async (
    _event,
    { title, defaultPath, fileContents }: SaveFileDialogPayload,
  ) => {
    const fileLocation = await dialog.showSaveDialog({ title, defaultPath });

    return new Promise<void>((resolve, reject) => {
      if (fileLocation) {
        const contents =
          typeof fileContents === 'string'
            ? fileContents
            : new Uint8Array(fileContents.buffer);
        fs.writeFile(fileLocation.filePath, contents, error => {
          return reject(error);
        });
      }
      resolve();
    });
  },
);

ipcMain.handle('open-external-url', (event, url) => {
  void shell.openExternal(url);
});

ipcMain.handle('open-in-file-manager', (event, filepath) => {
  shell.showItemInFolder(filepath);
});

ipcMain.on('message', (_event, msg) => {
  if (!serverProcess || lastAppInitFailure) {
    // The backend isn't there to answer. If we know why, tell the renderer
    // (again) so its pending requests reject instead of hanging forever.
    if (lastAppInitFailure && clientWin) {
      clientWin.webContents.send('message', lastAppInitFailure);
    }
    return;
  }

  serverProcess.postMessage(msg.args);
});

ipcMain.on('set-theme', (_event, theme: string) => {
  const obj = { theme };
  if (clientWin) {
    void clientWin.webContents.executeJavaScript(
      `window.__actionsForMenu && window.__actionsForMenu.saveGlobalPrefs({ prefs: ${JSON.stringify(obj)} })`,
    );
  }
});

ipcMain.handle(
  'move-budget-directory',
  async (_event, currentBudgetDirectory: string, newDirectory: string) => {
    try {
      if (!currentBudgetDirectory || !newDirectory) {
        throw new Error('The from and to directories must be provided');
      }

      if (newDirectory.startsWith(currentBudgetDirectory)) {
        throw new Error(
          'The destination must not be a subdirectory of the current directory',
        );
      }

      if (!fs.existsSync(newDirectory)) {
        throw new Error('The destination directory does not exist');
      }

      await cp(currentBudgetDirectory, newDirectory, {
        force: true,
        preserveTimestamps: true,
        recursive: true,
      });
    } catch (error) {
      logMessage(
        'error',
        `There was an error moving your directory:  ${String(error)}`,
      );
      throw error;
    }

    try {
      await promiseRetry(
        async retry => {
          try {
            return await rm(currentBudgetDirectory, {
              recursive: true,
              force: true,
            });
          } catch (error) {
            logMessage(
              'info',
              `Retrying: Clean up old directory: ${currentBudgetDirectory}`,
            );

            retry(error);
          }
        },
        { minTimeout: 200, maxTimeout: 500, factor: 1.25 },
      );
    } catch (error) {
      // Fail silently. The move worked, but the old directory wasn't cleaned up - most likely a permission issue.
      // This call needs to succeed to allow the user to continue using the app with the files in the new location.
      logMessage(
        'error',
        `There was an error removing the old directory: ${String(error)}`,
      );
    }
  },
);
