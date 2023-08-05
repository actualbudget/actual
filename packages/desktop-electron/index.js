/* eslint-disable import/order */
// (I have no idea why the imports are like this. Not touching them.)
const isDev = require('electron-is-dev');
const fs = require('fs');

require('module').globalPaths.push(__dirname + '/..');

// Allow unsecure in dev
if (isDev) {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

const {
  app,
  ipcMain,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  protocol,
} = require('electron');
const promiseRetry = require('promise-retry');

// This allows relative URLs to be resolved to app:// which makes
// local assets load correctly
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true } },
]);

global.fetch = require('node-fetch');

const about = require('./about');
const { getRandomPort } = require('get-port-please');
const getMenu = require('./menu');
const updater = require('./updater');

require('./security');

const { fork } = require('child_process');
const path = require('path');

require('./setRequireHook');

if (!isDev || !process.env.ACTUAL_DOCUMENT_DIR) {
  process.env.ACTUAL_DOCUMENT_DIR = app.getPath('documents');
}

if (!isDev || !process.env.ACTUAL_DATA_DIR) {
  process.env.ACTUAL_DATA_DIR = app.getPath('userData');
}

// eslint-disable-next-line import/extensions
const WindowState = require('./window-state.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let clientWin;
let serverWin; // eslint-disable-line @typescript-eslint/no-unused-vars
let serverProcess;
let serverSocket;
let IS_QUITTING = false;

updater.onEvent((type, data) => {
  // Notify both the app and the about window
  if (clientWin) {
    clientWin.webContents.send(type, data);
  }

  if (about.getWindow()) {
    about.getWindow().webContents.send(type, data);
  }
});

if (isDev) {
  process.traceProcessWarnings = true;
}

function createBackgroundProcess(socketName) {
  serverProcess = fork(
    __dirname + '/server.js',
    ['--subprocess', app.getVersion(), socketName],
    isDev ? { execArgv: ['--inspect'] } : undefined,
  );

  serverProcess.on('message', msg => {
    switch (msg.type) {
      case 'captureEvent':
      case 'captureBreadcrumb':
        break;
      case 'shouldAutoUpdate':
        if (msg.flag) {
          updater.start();
        } else {
          updater.stop();
        }
        break;
      default:
        console.log('Unknown server message: ' + msg.type);
    }
  });
}

async function createWindow() {
  const windowState = await WindowState.get();

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
      enableRemoteModule: false,
      preload: __dirname + '/preload.js',
    },
  });
  win.setBackgroundColor('#E8ECF0');

  if (isDev) {
    win.webContents.openDevTools();
  }

  const unlistenToState = WindowState.listen(win, windowState);

  if (isDev) {
    win.loadURL(`file://${__dirname}/loading.html`);
    // Wait for the development server to start
    setTimeout(() => {
      promiseRetry(retry => win.loadURL('http://localhost:3001/').catch(retry));
    }, 3000);
  } else {
    win.loadURL(`app://actual/`);
  }

  win.on('close', () => {
    // We don't want to close the budget on exit because that will
    // clear the state which re-opens the last budget automatically on
    // startup
    if (!IS_QUITTING) {
      clientWin.webContents.executeJavaScript('__actionsForMenu.closeBudget()');
    }
  });

  win.on('closed', () => {
    clientWin = null;
    updateMenu(false);
    unlistenToState();
  });

  win.on('unresponsive', () => {
    console.log(
      'browser window went unresponsive (maybe because of a modal though)',
    );
  });

  win.on('focus', async () => {
    let url = clientWin.webContents.getURL();
    if (url.includes('app://') || url.includes('localhost:')) {
      clientWin.webContents.executeJavaScript('__actionsForMenu.focused()');
    }
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('set-socket', { name: serverSocket });
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

function isExternalUrl(url) {
  return !url.includes('localhost:') && !url.includes('app://');
}

function updateMenu(isBudgetOpen) {
  const menu = getMenu(isDev, createWindow);
  const file = menu.items.filter(item => item.label === 'File')[0];
  const fileItems = file.submenu.items;
  fileItems
    .filter(item => item.label === 'Load Backup...')
    .map(item => (item.enabled = isBudgetOpen));

  let tools = menu.items.filter(item => item.label === 'Tools')[0];
  tools.submenu.items.forEach(item => {
    item.enabled = isBudgetOpen;
  });

  const edit = menu.items.filter(item => item.label === 'Edit')[0];
  const editItems = edit.submenu.items;
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

app.setAppUserModelId('com.shiftreset.actual');

app.on('ready', async () => {
  serverSocket = await getRandomPort();

  // Install an `app://` protocol that always returns the base HTML
  // file no matter what URL it is. This allows us to use react-router
  // on the frontend
  protocol.registerFileProtocol('app', (request, callback) => {
    if (request.method !== 'GET') {
      callback({ error: -322 }); // METHOD_NOT_SUPPORTED from chromium/src/net/base/net_error_list.h
      return null;
    }

    const parsedUrl = new URL(request.url);
    if (parsedUrl.protocol !== 'app:') {
      callback({ error: -302 }); // UNKNOWN_URL_SCHEME
      return;
    }

    if (parsedUrl.host !== 'actual') {
      callback({ error: -105 }); // NAME_NOT_RESOLVED
      return;
    }

    const pathname = parsedUrl.pathname;

    if (pathname.startsWith('/static')) {
      callback({
        path: path.normalize(`${__dirname}/client-build${pathname}`),
      });
    } else {
      callback({
        path: path.normalize(`${__dirname}/client-build/index.html`),
      });
    }
  });

  if (process.argv[1] !== '--server') {
    await createWindow();
  }

  // This is mainly to aid debugging Sentry errors - it will add a
  // breadcrumb
  require('electron').powerMonitor.on('suspend', () => {
    console.log('Suspending', new Date());
  });

  createBackgroundProcess(serverSocket);
});

app.on('window-all-closed', () => {
  // On macOS, closing all windows shouldn't exit the process
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  IS_QUITTING = true;
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

ipcMain.on('get-bootstrap-data', event => {
  event.returnValue = {
    version: app.getVersion(),
    isDev,
  };
});

ipcMain.handle('relaunch', () => {
  app.relaunch();
  app.exit();
});

ipcMain.handle('open-file-dialog', (event, { filters, properties }) => {
  return dialog.showOpenDialogSync({
    properties: properties || ['openFile'],
    filters,
  });
});

ipcMain.handle(
  'save-file-dialog',
  (event, { title, defaultPath, fileContents }) => {
    let fileLocation = dialog.showSaveDialogSync({ title, defaultPath });

    return new Promise((resolve, reject) => {
      if (fileLocation) {
        fs.writeFile(fileLocation, fileContents, error => {
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

ipcMain.on('show-about', () => {
  about.openAboutWindow();
});

ipcMain.on('screenshot', () => {
  if (isDev) {
    let width = 1100;

    // This is for the main screenshot inside the frame
    clientWin.setSize(width, Math.floor(width * (427 / 623)));
    // clientWin.setSize(width, Math.floor(width * (495 / 700)));
  }
});

ipcMain.on('check-for-update', () => {
  // If the updater is in the middle of an update already, send the
  // about window the current status
  if (updater.isChecking()) {
    // This should always come from the about window so we can
    // guarantee that it exists. If we ever see an error here
    // something is wrong
    about.getWindow().webContents.send(updater.getLastEvent());
  } else {
    updater.check();
  }
});

ipcMain.on('apply-update', () => {
  updater.apply();
});

ipcMain.on('update-menu', (event, isBudgetOpen) => {
  updateMenu(isBudgetOpen);
});
