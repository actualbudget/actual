import fs from 'fs';
import { createServer, Server } from 'http';
import path from 'path';

import {
  net,
  app,
  ipcMain,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  powerMonitor,
  protocol,
  utilityProcess,
  UtilityProcess,
  OpenDialogSyncOptions,
  SaveDialogOptions,
  Env,
  ForkOptions,
} from 'electron';
import { copy, exists, mkdir, remove } from 'fs-extra';
import promiseRetry from 'promise-retry';

import type { GlobalPrefsJson } from '../loot-core/src/types/prefs';

import { getMenu } from './menu';
import {
  get as getWindowState,
  listen as listenToWindowState,
} from './window-state';

import './security';

const BUILD_ROOT = `${__dirname}/..`;

const isPlaywrightTest = process.env.EXECUTION_CONTEXT === 'playwright';
const isDev = !isPlaywrightTest && !app.isPackaged; // dev mode if not packaged and not playwright

process.env.lootCoreScript = isDev
  ? 'loot-core/lib-dist/electron/bundle.desktop.js' // serve from local output in development (provides hot-reloading)
  : path.resolve(BUILD_ROOT, 'loot-core/lib-dist/electron/bundle.desktop.js'); // serve from build in production

// This allows relative URLs to be resolved to app:// which makes
// local assets load correctly
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true } },
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
    clientWin.webContents.executeJavaScript(
      `console.${loglevel}(${trimmedMessage})`,
    );
  }
};

const createOAuthServer = async () => {
  const port = 3010;
  logMessage('info', `OAuth server running on port: ${port}`);

  if (oAuthServer) {
    return { url: `http://localhost:${port}`, server: oAuthServer };
  }

  return new Promise<{ url: string; server: Server }>(resolve => {
    const server = createServer((req, res) => {
      const query = new URL(req.url || '', `http://localhost:${port}`)
        .searchParams;

      const code = query.get('token');
      if (code && clientWin) {
        if (isDev) {
          clientWin.loadURL(`http://localhost:3001/openid-cb?token=${code}`);
        } else {
          clientWin.loadURL(`app://actual/openid-cb?token=${code}`);
        }

        // Respond to the browser
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OpenID login successful! You can close this tab.');

        // Clean up the server after receiving the code
        server.close();
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No token received.');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      resolve({ url: `http://localhost:${port}`, server });
    });
  });
};

if (isDev) {
  process.traceProcessWarnings = true;
}

async function loadGlobalPrefs() {
  let state: GlobalPrefsJson = {};
  try {
    state = JSON.parse(
      fs.readFileSync(
        path.join(process.env.ACTUAL_DATA_DIR!, 'global-store.json'),
        'utf8',
      ),
    );
  } catch (e) {
    logMessage('info', 'Could not load global state - using defaults');
    state = {};
  }

  return state;
}

async function createBackgroundProcess() {
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

  serverProcess.on('message', msg => {
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
      default:
        logMessage('info', 'Unknown server message: ' + msg.type);
    }
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
      hostname: 'localhost',
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

    const serverPath = path.join(
      // require.resolve will recursively search up the workspace for the module
      path.dirname(require.resolve('@actual-app/sync-server/package.json')),
      'build',
      'app.js',
    );

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
      mkdir(syncServerConfig.ACTUAL_SERVER_DATA_DIR, { recursive: true });
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
    logMessage('error', `Sync-Server: Error starting sync server: ${error}`);
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
  });

  win.setBackgroundColor('#E8ECF0');

  if (isDev) {
    win.webContents.openDevTools();
  }

  const unlistenToState = listenToWindowState(win, windowState);

  if (isDev) {
    win.loadURL(`file://${__dirname}/loading.html`);
    // Wait for the development server to start
    setTimeout(() => {
      promiseRetry(retry => win.loadURL('http://localhost:3001/').catch(retry));
    }, 3000);
  } else {
    win.loadURL(`app://actual/`);
  }

  win.on('closed', () => {
    clientWin = null;
    updateMenu();
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
        clientWin.webContents.executeJavaScript(
          'window.__actionsForMenu.appFocused()',
        );
      }
    }
  });

  // hit when middle-clicking buttons or <a href/> with a target set to _blank
  // always deny, optionally redirect to browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  // hit when clicking <a href/> with no target
  // optionally redirect to browser
  win.webContents.on('will-navigate', (event, url) => {
    if (isExternalUrl(url)) {
      shell.openExternal(url);
      event.preventDefault();
    }
  });

  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null);
    win.setMenu(getMenu(isDev, createWindow));
  } else {
    Menu.setApplicationMenu(getMenu(isDev, createWindow));
  }

  clientWin = win;

  // Execute queued logs - displaying them in the client window
  queuedClientWinLogs.map((log: string) =>
    win.webContents.executeJavaScript(log),
  );

  queuedClientWinLogs = [];
}

function isExternalUrl(url: string) {
  return !url.includes('localhost:') && !url.includes('app://');
}

function updateMenu(budgetId?: string) {
  const isBudgetOpen = !!budgetId;
  const menu = getMenu(isDev, createWindow, budgetId);
  const file = menu.items.filter(item => item.label === 'File')[0];
  const fileItems = file.submenu?.items || [];
  fileItems
    .filter(item => item.label === 'Load Backup...')
    .forEach(item => {
      item.enabled = isBudgetOpen;
    });

  const tools = menu.items.filter(item => item.label === 'Tools')[0];
  tools.submenu?.items.forEach(item => {
    item.enabled = isBudgetOpen;
  });

  const edit = menu.items.filter(item => item.label === 'Edit')[0];
  const editItems = edit.submenu?.items || [];
  editItems
    .filter(item => item.label === 'Undo' || item.label === 'Redo')
    .map(item => (item.enabled = isBudgetOpen));

  if (process.platform === 'win32') {
    if (clientWin) {
      clientWin.setMenu(menu);
    }
  } else {
    Menu.setApplicationMenu(menu);
  }
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
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on('activate', () => {
  if (clientWin === null) {
    createWindow();
  }
});

export type GetBootstrapDataPayload = {
  version: string;
  isDev: boolean;
};

ipcMain.on('get-bootstrap-data', event => {
  const payload: GetBootstrapDataPayload = {
    version: app.getVersion(),
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
    serverProcess.kill();
    serverProcess = null;
  }

  createBackgroundProcess();
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
  shell.openExternal(url);
});

ipcMain.on('message', (_event, msg) => {
  if (!serverProcess) {
    return;
  }

  serverProcess.postMessage(msg.args);
});

ipcMain.on('screenshot', () => {
  if (isDev) {
    const width = 1100;

    // This is for the main screenshot inside the frame
    if (clientWin) {
      clientWin.setSize(width, Math.floor(width * (427 / 623)));
    }
  }
});

ipcMain.on('update-menu', (_event, budgetId?: string) => {
  updateMenu(budgetId);
});

ipcMain.on('set-theme', (_event, theme: string) => {
  const obj = { theme };
  if (clientWin) {
    clientWin.webContents.executeJavaScript(
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

      if (!(await exists(newDirectory))) {
        throw new Error('The destination directory does not exist');
      }

      await copy(currentBudgetDirectory, newDirectory, {
        overwrite: true,
        preserveTimestamps: true,
      });
    } catch (error) {
      logMessage(
        'error',
        `There was an error moving your directory:  ${error}`,
      );
      throw error;
    }

    try {
      await promiseRetry(
        async retry => {
          try {
            return await remove(currentBudgetDirectory);
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
        `There was an error removing the old directory: ${error}`,
      );
    }
  },
);
