import { initBackend as initSQLBackend } from 'absurd-sql/dist/indexeddb-main-thread';
import { registerSW } from 'virtual:pwa-register';

import * as Platform from 'loot-core/shared/platform';

// eslint-disable-next-line typescript-paths/absolute-parent-import
import packageJson from '../package.json';

const backendWorkerUrl = new URL('./browser-server.js', import.meta.url);

// This file installs global variables that the app expects.
// Normally these are already provided by electron, but in a real
// browser environment this is where we initialize the backend and
// everything else.

const IS_DEV = process.env.NODE_ENV === 'development';
const ACTUAL_VERSION = Platform.isPlaywright
  ? '99.9.9'
  : process.env.REACT_APP_REVIEW_ID
    ? '.preview'
    : packageJson.version;

// *** Start the backend ***
let worker = null;

function createBackendWorker() {
  worker = new Worker(backendWorkerUrl);
  initSQLBackend(worker);

  if (window.SharedArrayBuffer) {
    localStorage.removeItem('SharedArrayBufferOverride');
  }

  worker.postMessage({
    type: 'init',
    version: ACTUAL_VERSION,
    isDev: IS_DEV,
    publicUrl: process.env.PUBLIC_URL,
    hash: process.env.REACT_APP_BACKEND_WORKER_HASH,
    isSharedArrayBufferOverrideEnabled: localStorage.getItem(
      'SharedArrayBufferOverride',
    ),
  });
}

createBackendWorker();

let isUpdateReadyForDownload = false;
let markUpdateReadyForDownload;
const isUpdateReadyForDownloadPromise = new Promise(resolve => {
  markUpdateReadyForDownload = () => {
    isUpdateReadyForDownload = true;
    resolve(true);
  };
});
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: markUpdateReadyForDownload,
});

global.Actual = {
  IS_DEV,
  ACTUAL_VERSION,

  logToTerminal: (...args) => {
    console.log(...args);
  },

  relaunch: () => {
    window.location.reload();
  },

  reload: () => {
    if (window.navigator.serviceWorker == null) return;

    // Unregister the service worker handling routing and then reload. This should force the reload
    // to query the actual server rather than delegating to the worker
    return window.navigator.serviceWorker
      .getRegistration('/')
      .then(registration => {
        if (registration == null) return;
        return registration.unregister();
      })
      .then(() => {
        window.location.reload();
      });
  },

  startSyncServer: () => {},

  stopSyncServer: () => {},

  isSyncServerRunning: () => false,

  startOAuthServer: () => {
    return '';
  },

  restartElectronServer: () => {},

  openFileDialog: async ({ filters = [] }) => {
    const FILE_ACCEPT_OVERRIDES = {
      // Safari on iOS requires explicit MIME/UTType values for some extensions to allow selection.
      qfx: [
        'application/vnd.intu.qfx',
        'application/x-qfx',
        'application/qfx',
        'application/ofx',
        'application/x-ofx',
        'application/octet-stream',
        'com.intuit.qfx',
      ],
    };

    return new Promise(resolve => {
      let createdElement = false;
      // Attempt to reuse an already-created file input.
      let input = document.body.querySelector(
        'input[id="open-file-dialog-input"]',
      );
      if (!input) {
        createdElement = true;
        input = document.createElement('input');
      }

      input.type = 'file';
      input.id = 'open-file-dialog-input';
      input.value = null;

      const filter = filters.find(filter => filter.extensions);
      if (filter) {
        input.accept = filter.extensions
          .flatMap(ext => {
            const normalizedExt = ext.startsWith('.')
              ? ext.toLowerCase()
              : `.${ext.toLowerCase()}`;
            const overrides = FILE_ACCEPT_OVERRIDES[ext.toLowerCase()] ?? [];
            return [normalizedExt, ...overrides];
          })
          .join(',');
      }

      input.style.position = 'absolute';
      input.style.top = '0px';
      input.style.left = '0px';
      input.style.display = 'none';

      input.onchange = e => {
        const file = e.target.files[0];
        const filename = file.name.replace(/.*(\.[^.]*)/, 'file$1');

        if (file) {
          const reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = async function (ev) {
            const filepath = `/uploads/${filename}`;

            window.__actionsForMenu
              .uploadFile(filename, ev.target.result)
              .then(() => resolve([filepath]));
          };
          reader.onerror = function () {
            alert('Error reading file');
          };
        }
      };

      // In Safari the file input has to be in the DOM for change events to
      // reliably fire.
      if (createdElement) {
        document.body.appendChild(input);
      }

      input.click();
    });
  },

  saveFile: (contents, defaultFilename) => {
    const temp = document.createElement('a');
    temp.style = 'display: none';
    temp.download = defaultFilename;
    temp.rel = 'noopener';

    const blob = new Blob([contents]);
    temp.href = URL.createObjectURL(blob);
    temp.dispatchEvent(new MouseEvent('click'));
  },

  openURLInBrowser: url => {
    window.open(url, '_blank');
  },
  openInFileManager: () => {
    // File manager not available in browser
  },
  onEventFromMain: () => {},
  isUpdateReadyForDownload: () => isUpdateReadyForDownload,
  waitForUpdateReadyForDownload: () => isUpdateReadyForDownloadPromise,
  applyAppUpdate: async () => {
    updateSW();

    // Wait for the app to reload
    await new Promise(() => {});
  },

  ipcConnect: () => {},
  getServerSocket: async () => {
    return worker;
  },

  setTheme: theme => {
    window.__actionsForMenu.saveGlobalPrefs({ prefs: { theme } });
  },

  moveBudgetDirectory: () => {},
};
