import fs from 'fs';
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
} from 'electron';
import { copy, exists, remove } from 'fs-extra';
import promiseRetry from 'promise-retry';

import { getMenu } from './menu';
import {
  get as getWindowState,
  listen as listenToWindowState,
} from './window-state';

import './security';
import AdmZip from 'adm-zip';

const isDev = !app.isPackaged; // dev mode if not packaged

process.env.lootCoreScript = isDev
  ? 'loot-core/lib-dist/bundle.desktop.js' // serve from local output in development (provides hot-reloading)
  : path.resolve(__dirname, 'loot-core/lib-dist/bundle.desktop.js'); // serve from build in production

// This allows relative URLs to be resolved to app:// which makes
// local assets load correctly
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true } },
]);

if (!isDev || !process.env.ACTUAL_DOCUMENT_DIR) {
  process.env.ACTUAL_DOCUMENT_DIR = app.getPath('documents');
}

if (!isDev || !process.env.ACTUAL_DATA_DIR) {
  process.env.ACTUAL_DATA_DIR = app.getPath('userData');
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let clientWin: BrowserWindow | null;
let serverProcess: UtilityProcess | null;

if (isDev) {
  process.traceProcessWarnings = true;
}

function createBackgroundProcess() {
  serverProcess = utilityProcess.fork(
    __dirname + '/server.js',
    ['--subprocess', app.getVersion()],
    isDev ? { execArgv: ['--inspect'], stdio: 'pipe' } : { stdio: 'pipe' },
  );

  serverProcess.stdout?.on('data', (chunk: Buffer) => {
    // Send the Server console.log messages to the main browser window
    clientWin?.webContents.executeJavaScript(`
      console.info('Server Log:', ${JSON.stringify(chunk.toString('utf8'))})`);
  });

  serverProcess.stderr?.on('data', (chunk: Buffer) => {
    // Send the Server console.error messages out to the main browser window
    clientWin?.webContents.executeJavaScript(`
      console.error('Server Log:', ${JSON.stringify(chunk.toString('utf8'))})`);
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
        console.log('Unknown server message: ' + msg.type);
    }
  });
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
    console.log(
      'browser window went unresponsive (maybe because of a modal though)',
    );
  });

  win.on('focus', async () => {
    if (clientWin) {
      const url = clientWin.webContents.getURL();
      if (url.includes('app://') || url.includes('localhost:')) {
        clientWin.webContents.executeJavaScript(
          'window.__actionsForMenu.focused()',
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

    let filePath = path.normalize(`${__dirname}/client-build/index.html`); // default web path

    if (pathname.startsWith('/static')) {
      // static assets
      filePath = path.normalize(`${__dirname}/client-build${pathname}`);
      const resolvedPath = path.resolve(filePath);
      const clientBuildPath = path.resolve(__dirname, 'client-build');

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
    console.log('Suspending', new Date());
  });

  createBackgroundProcess();
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
  properties: OpenDialogSyncOptions['properties'];
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
  fileContents: string | NodeJS.ArrayBufferView;
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
        fs.writeFile(fileLocation.filePath, fileContents, error => {
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

ipcMain.handle(
  'download-actual-server',
  async (_event, payload: { releaseVersion: string }) => {
    console.info({ payload });
    const downloadUrl = `https://github.com/MikesGlitch/actual-server/releases/download/${payload.releaseVersion}/${payload.releaseVersion}-server-sync-dist.zip`;

    try {
      const res = await fetch(downloadUrl);
      const arrBuffer = await res.arrayBuffer();
      const zipped = new AdmZip(Buffer.from(arrBuffer));
      console.info(
        'actual-server will be installed here:',
        process.env.ACTUAL_DATA_DIR,
      );
      zipped.extractAllTo(
        process.env.ACTUAL_DATA_DIR + '/actual-server-releases',
        true,
        false,
      );
      return { error: undefined };
    } catch (error) {
      console.error('Error retrieving actual-server:', error);
      return { error };
    }
  },
);

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
      `window.__actionsForMenu && window.__actionsForMenu.saveGlobalPrefs(${JSON.stringify(obj)})`,
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
      });
      await remove(currentBudgetDirectory);
    } catch (error) {
      console.error('There was an error moving your directory', error);
      throw error;
    }
  },
);
