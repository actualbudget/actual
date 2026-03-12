import { initBackend as initSQLBackend } from 'absurd-sql/dist/indexeddb-main-thread';
import { registerSW } from 'virtual:pwa-register';

import * as Platform from 'loot-core/shared/platform';

// oxlint-disable-next-line typescript-paths/absolute-parent-import
import packageJson from '../package.json';

const backendWorkerUrl = new URL('./browser-server.js', import.meta.url);
const sharedBackendWorkerUrl = new URL(
  './shared-browser-server.js',
  import.meta.url,
);

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
let useSharedWorker = false;

function createBackendWorker() {
  // Use SharedWorker for multi-tab support: all tabs share a single backend,
  // preventing sync conflicts from multiple tabs having separate database
  // connections and merkle tries. Falls back to regular Worker if SharedWorker
  // is unavailable (e.g. Playwright tests, older browsers).
  if (typeof SharedWorker !== 'undefined' && !Platform.isPlaywright) {
    try {
      const sharedWorker = new SharedWorker(sharedBackendWorkerUrl, {
        name: 'actual-backend',
      });
      worker = sharedWorker.port;
      // initSQLBackend listens for __absurd:spawn-idb-worker messages forwarded
      // from the SharedWorker and creates the IndexedDB child worker on this tab's
      // main thread. The child worker communicates with the backend in the
      // SharedWorker via SharedArrayBuffer/Atomics.
      initSQLBackend(worker);
      // Don't call worker.start() here. The port must remain un-started so that
      // messages from the SharedWorker (especially 'connect') are queued until
      // connectWorker() sets onmessage, which implicitly starts the port.
      // Without this, the second tab's 'connect' message arrives before the
      // onmessage handler is ready and gets lost.
      useSharedWorker = true;

      // Surface SharedWorker console output in this tab's DevTools
      worker.addEventListener('message', event => {
        const msg = event.data;
        if (msg && msg.type === '__shared-worker-console') {
          const method = console[msg.level] || console.log;
          method(...msg.args);
        }
      });
    } catch (e) {
      console.log('SharedWorker failed, falling back to Worker:', e);
      worker = new Worker(backendWorkerUrl);
      initSQLBackend(worker);
    }
  } else {
    worker = new Worker(backendWorkerUrl);
    initSQLBackend(worker);
  }

  if (window.SharedArrayBuffer) {
    localStorage.removeItem('SharedArrayBufferOverride');
  }

  worker.postMessage({
    type: 'init',
    version: ACTUAL_VERSION,
    isDev: IS_DEV,
    publicUrl: process.env.PUBLIC_URL,
    hash: process.env.REACT_APP_BACKEND_WORKER_HASH,
    hasSharedArrayBuffer: !!window.SharedArrayBuffer,
    isSharedArrayBufferOverrideEnabled: localStorage.getItem(
      'SharedArrayBufferOverride',
    ),
  });

  // Notify SharedWorker when this tab is closing so it can clean up the port
  if (useSharedWorker) {
    window.addEventListener('beforeunload', () => {
      worker.postMessage({ type: 'tab-closing' });
    });
  }
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

  startSyncServer: () => {
    // Only for electron app
  },

  stopSyncServer: () => {
    // Only for electron app
  },

  isSyncServerRunning: () => false,

  startOAuthServer: () => {
    return '';
  },

  restartElectronServer: () => {
    // Only for electron app
  },

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

            void window.__actionsForMenu
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
  onEventFromMain: () => {
    // Only for electron app
  },
  isUpdateReadyForDownload: () => isUpdateReadyForDownload,
  waitForUpdateReadyForDownload: () => isUpdateReadyForDownloadPromise,
  applyAppUpdate: async () => {
    updateSW();

    // Wait for the app to reload
    await new Promise(() => {
      // Do nothing
    });
  },

  ipcConnect: () => {
    // Only for electron app
  },
  getServerSocket: async () => {
    return worker;
  },

  setTheme: theme => {
    window.__actionsForMenu.saveGlobalPrefs({ prefs: { theme } });
  },

  moveBudgetDirectory: () => {
    // Only for electron app
  },
};
