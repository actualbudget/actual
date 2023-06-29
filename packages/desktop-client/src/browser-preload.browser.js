import { initBackend as initSQLBackend } from 'absurd-sql/dist/indexeddb-main-thread';

import packageJson from '../package.json';

const backendWorkerUrl = new URL('./browser-server.js', import.meta.url);

// This file installs global variables that the app expects.
// Normally these are already provided by electron, but in a real
// browser environment this is where we initialize the backend and
// everything else.

let IS_DEV = process.env.NODE_ENV === 'development';
let ACTUAL_VERSION = packageJson.version;

// *** Start the backend ***
let worker;

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

global.Actual = {
  IS_DEV,
  ACTUAL_VERSION,
  IS_FAKE_WEB: true,

  logToTerminal: (...args) => {
    console.log(...args);
  },

  relaunch: () => {
    window.location.reload();
  },

  openFileDialog: async ({ filters = [], properties }) => {
    return new Promise(resolve => {
      let input = document.createElement('input');
      input.type = 'file';

      let filter = filters.find(filter => filter.extensions);
      if (filter) {
        input.accept = filter.extensions.map(ext => '.' + ext).join(',');
      }

      input.style.position = 'absolute';
      input.style.top = '0px';
      input.style.left = '0px';
      input.dispatchEvent(
        new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        }),
      );

      input.addEventListener('change', e => {
        let file = e.target.files[0];
        let filename = file.name.replace(/.*(\.[^.]*)/, 'file$1');

        if (file) {
          var reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = async function (ev) {
            let filepath = `/uploads/${filename}`;

            window.__actionsForMenu
              .uploadFile(filename, ev.target.result)
              .then(() => resolve([filepath]));
          };
          reader.onerror = function (ev) {
            alert('Error reading file');
          };
        }
      });
    });
  },

  saveFile: (contents, defaultFilename, dialogTitle) => {
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
  onEventFromMain: (type, handler) => {},
  applyAppUpdate: () => {},
  updateAppMenu: isBudgetOpen => {},

  getServerSocket: async () => {
    return worker;
  },
};

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey) {
    // Cmd/Ctrl+o
    if (e.key === 'o') {
      e.preventDefault();
      window.__actionsForMenu.closeBudget();
    }
    // Cmd/Ctrl+z
    else if (e.key.toLowerCase() === 'z') {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) {
        // Redo
        window.__actionsForMenu.redo();
      } else {
        // Undo
        window.__actionsForMenu.undo();
      }
    }
  }
});
