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
// The regular Worker running the backend, created only on the leader tab
let localBackendWorker = null;

/**
 * WorkerBridge wraps a SharedWorker port and presents a Worker-like interface
 * (onmessage, postMessage, addEventListener, start) to the connection layer.
 *
 * If the SharedWorker tells this tab to go standalone (because it wants a
 * different budget from the shared leader), the bridge transparently creates
 * its own dedicated Worker and routes all future communication through it.
 */
class WorkerBridge {
  constructor(sharedPort) {
    this._sharedPort = sharedPort;
    this._standaloneWorker = null;
    this._onmessage = null;
    this._listeners = [];
    this._started = false;

    // Listen for all messages from the SharedWorker port
    sharedPort.addEventListener('message', e => this._onSharedMessage(e));
  }

  set onmessage(handler) {
    this._onmessage = handler;
    // Setting onmessage on a real MessagePort implicitly starts it.
    // We need to do this explicitly on the underlying port.
    if (!this._started) {
      this._started = true;
      this._sharedPort.start();
    }
  }

  get onmessage() {
    return this._onmessage;
  }

  postMessage(msg) {
    if (this._standaloneWorker) {
      this._standaloneWorker.postMessage(msg);
    } else {
      this._sharedPort.postMessage(msg);
    }
  }

  addEventListener(type, handler) {
    this._listeners.push({ type, handler });
  }

  start() {
    if (!this._started) {
      this._started = true;
      this._sharedPort.start();
    }
  }

  _dispatch(event) {
    if (this._onmessage) this._onmessage(event);
    for (const { type, handler } of this._listeners) {
      if (type === 'message') handler(event);
    }
  }

  _onSharedMessage(event) {
    const msg = event.data;

    // Elected as leader: create the real backend Worker on this tab
    if (msg && msg.type === '__become-leader') {
      console.log(
        '[WorkerBridge] This tab elected as LEADER — creating backend Worker',
      );
      this._createLocalWorker(msg.initMsg, msg.budgetToRestore);
      return;
    }

    // Forward requests from SharedWorker to our local Worker
    if (msg && msg.type === '__to-worker') {
      if (localBackendWorker) {
        localBackendWorker.postMessage(msg.msg);
      }
      return;
    }

    // SharedWorker says: this tab needs a different budget, go standalone
    if (msg && msg.type === '__use-standalone') {
      console.log(
        '[WorkerBridge] Switching to STANDALONE Worker (different budget)',
      );
      this._switchToStandalone(msg.initMsg, msg.pendingMsg);
      return;
    }

    // Surface SharedWorker console output in this tab's DevTools
    if (msg && msg.type === '__shared-worker-console') {
      const method = console[msg.level] || console.log;
      method(...msg.args);
      return;
    }

    // Respond to heartbeat pings so SharedWorker can detect dead tabs
    if (msg && msg.type === '__heartbeat-ping') {
      this._sharedPort.postMessage({ type: '__heartbeat-pong' });
      return;
    }

    // Everything else goes to the connection layer
    this._dispatch(event);
  }

  _createLocalWorker(initMsg, budgetToRestore) {
    if (localBackendWorker) {
      localBackendWorker.terminate();
    }
    localBackendWorker = new Worker(backendWorkerUrl);
    initSQLBackend(localBackendWorker);

    const sharedPort = this._sharedPort;
    localBackendWorker.onmessage = workerEvent => {
      const workerMsg = workerEvent.data;
      // absurd-sql internal messages are handled by initSQLBackend
      if (
        workerMsg &&
        workerMsg.type &&
        workerMsg.type.startsWith('__absurd:')
      ) {
        return;
      }
      // After the backend connects, automatically reload the budget that was
      // open before the leader left (e.g. page refresh). This lets other tabs
      // continue working without being sent to the budget list.
      if (workerMsg.type === 'connect' && budgetToRestore) {
        console.log(
          `[WorkerBridge] Backend connected, restoring budget "${budgetToRestore}"`,
        );
        const id = budgetToRestore;
        budgetToRestore = null;
        localBackendWorker.postMessage({
          id: '__restore-budget',
          name: 'load-budget',
          args: { id },
          catchErrors: true,
        });
      }
      sharedPort.postMessage({ type: '__from-worker', msg: workerMsg });
    };

    localBackendWorker.postMessage(initMsg);
  }

  _switchToStandalone(initMsg, pendingMsg) {
    // Create a dedicated Worker just for this tab
    const sw = new Worker(backendWorkerUrl);
    this._standaloneWorker = sw;
    initSQLBackend(sw);

    let pending = pendingMsg;
    sw.onmessage = event => {
      const msg = event.data;
      // absurd-sql internal messages are handled by initSQLBackend
      if (msg && msg.type && msg.type.startsWith('__absurd:')) {
        return;
      }
      // When the standalone Worker connects, send the queued load-budget
      if (msg.type === 'connect' && pending) {
        const toSend = pending;
        pending = null;
        setTimeout(() => sw.postMessage(toSend), 0);
      }
      this._dispatch(event);
    };

    // Disconnect from SharedWorker coordination
    console.log(
      '[WorkerBridge] Disconnecting from SharedWorker, booting standalone',
    );
    this._sharedPort.postMessage({ type: 'tab-closing' });

    // Boot the standalone Worker
    sw.postMessage(initMsg);
  }
}

function createBackendWorker() {
  // Use SharedWorker as a coordinator for multi-tab support: one tab is elected
  // "leader" and runs the backend in a regular dedicated Worker. All other tabs
  // send messages through the SharedWorker, which routes them to the leader.
  // The SharedWorker never touches SharedArrayBuffer, so this works on all
  // platforms including iOS/Safari.
  //
  // If two tabs open different budgets, the second tab transparently falls back
  // to its own standalone Worker so both budgets run independently.
  if (typeof SharedWorker !== 'undefined' && !Platform.isPlaywright) {
    try {
      const sharedWorker = new SharedWorker(sharedBackendWorkerUrl, {
        name: 'actual-backend',
      });
      const sharedPort = sharedWorker.port;

      // WorkerBridge presents a Worker-like interface to the connection layer.
      // It routes through the SharedWorker normally, and seamlessly switches
      // to a standalone Worker if needed (different budget).
      worker = new WorkerBridge(sharedPort);
      console.log('[WorkerBridge] Connected to SharedWorker coordinator');

      // Don't call start() here. The port must remain un-started so that
      // messages (especially 'connect') are queued until connectWorker()
      // sets onmessage, which implicitly starts the port via the bridge.

      if (window.SharedArrayBuffer) {
        localStorage.removeItem('SharedArrayBufferOverride');
      }

      sharedPort.postMessage({
        type: 'init',
        version: ACTUAL_VERSION,
        isDev: IS_DEV,
        publicUrl: process.env.PUBLIC_URL,
        hash: process.env.REACT_APP_BACKEND_WORKER_HASH,
        isSharedArrayBufferOverrideEnabled: localStorage.getItem(
          'SharedArrayBufferOverride',
        ),
      });

      window.addEventListener('beforeunload', () => {
        sharedPort.postMessage({ type: 'tab-closing' });
      });

      return;
    } catch (e) {
      console.log('SharedWorker failed, falling back to Worker:', e);
    }
  }

  // Fallback: regular Worker (Playwright, no SharedWorker support, or failure)
  console.log('[WorkerBridge] No SharedWorker available, using direct Worker');
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
    hasSharedArrayBuffer: !!window.SharedArrayBuffer,
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
