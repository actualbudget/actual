import { type ChangeEvent } from 'react';

import { initBackend as initSQLBackend } from 'absurd-sql/dist/indexeddb-main-thread';

import * as Platform from 'loot-core/src/client/platform';

import packageJson from '../package.json';

const backendWorkerUrl = new URL('./browser-server.js', import.meta.url);

// This file installs global variables that the app expects.
// Normally these are already provided by electron, but in a real
// browser environment this is where we initialize the backend and
// everything else.

const IS_DEV = process.env.NODE_ENV === 'development';
const ACTUAL_VERSION = Platform.isPlaywright ? '99.9.9' : packageJson.version;

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

export type ActualType = typeof Actual;
const Actual = {
  IS_DEV,
  ACTUAL_VERSION,

  logToTerminal: (...args) => {
    console.log(...args);
  },

  relaunch: () => {
    window.location.reload();
  },

  openFileDialog: async ({
    filters = [],
  }: {
    filters: { name: string; extensions: string[] }[];
  }) => {
    return new Promise(resolve => {
      let createdElement = false;
      // Attempt to reuse an already-created file input.
      let input = document.body.querySelector(
        'input[id="open-file-dialog-input"]',
      ) as HTMLInputElement | null;
      if (!input) {
        createdElement = true;
        input = document.createElement('input');
      }

      input.type = 'file';
      input.id = 'open-file-dialog-input';
      input.value = null as unknown as string;

      const filter = filters.find(filter => filter.extensions);
      if (filter) {
        input.accept = filter.extensions.map(ext => '.' + ext).join(',');
      }

      input.style.position = 'absolute';
      input.style.top = '0px';
      input.style.left = '0px';
      input.style.display = 'none';

      input.onchange = e => {
        const event = e as unknown as ChangeEvent<HTMLInputElement>;
        if (!event?.target?.files) return;
        const file = event.target.files[0];
        const filename = file.name.replace(/.*(\.[^.]*)/, 'file$1');

        if (file) {
          const reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = async function (ev) {
            if (!ev.target?.result) return;
            const filepath = `/uploads/${filename}`;

            window.__actionsForMenu
              .uploadFile(filename, ev.target.result as ArrayBuffer)
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
    const temp = document.createElement('a') as HTMLAnchorElement;
    temp.style.display = 'none';
    temp.download = defaultFilename;
    temp.rel = 'noopener';

    const blob = new Blob([contents]);
    temp.href = URL.createObjectURL(blob);
    temp.dispatchEvent(new MouseEvent('click'));
  },

  openURLInBrowser: url => {
    window.open(url, '_blank');
  },
  onEventFromMain: () => {},
  applyAppUpdate: () => {},
  updateAppMenu: () => {},

  ipcConnect: () => {},
  getServerSocket: async () => {
    return worker;
  },

  setTheme: theme => {
    window.__actionsForMenu.saveGlobalPrefs({ theme });
  },
};

global.Actual = Actual;

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    // Cmd/Ctrl+o
    if (e.key === 'o') {
      e.preventDefault();
      window.__actionsForMenu.closeBudget();
    }
    // Cmd/Ctrl+z
    else if (e.key.toLowerCase() === 'z') {
      if (!e?.target) return;
      if (
        (e.target as Element).tagName === 'INPUT' ||
        (e.target as Element).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).isContentEditable
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
