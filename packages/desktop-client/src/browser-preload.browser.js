import { initBackend as initSQLBackend } from 'absurd-sql/dist/indexeddb-main-thread';
// eslint-disable-next-line import/no-webpack-loader-syntax
import BackendWorker from 'worker-loader!./browser-server';

// This file installs global variables that the app expects.
// Normally these are already provided by electron, but in a real
// browser environment this is where we initialize the backend and
// everything else.

let IS_DEV = process.env.NODE_ENV === 'development';
let IS_PERF_BUILD = process.env.PERF_BUILD != null;
let ACTUAL_VERSION = process.env.REACT_APP_ACTUAL_VERSION;

// *** Start the backend ***
let worker;

function createBackendWorker() {
  worker = new BackendWorker();
  initSQLBackend(worker);

  worker.postMessage({
    type: 'init',
    version: ACTUAL_VERSION,
    isDev: IS_DEV,
    hash: process.env.REACT_APP_BACKEND_WORKER_HASH
  });

  if (IS_DEV || IS_PERF_BUILD) {
    worker.addEventListener('message', e => {
      if (e.data.type === '__actual:backend-running') {
        let activity = document.querySelector('.debugger .activity');
        if (activity) {
          let original = window.getComputedStyle(activity)['background-color'];
          activity.style.transition = 'none';
          activity.style.backgroundColor = '#3EBD93';
          setTimeout(() => {
            activity.style.transition = 'background-color 1s';
            activity.style.backgroundColor = original;
          }, 100);
        }
      }
    });

    import('perf-deets/frontend').then(({ listenForPerfData }) => {
      listenForPerfData(worker);
    });
  }
}

createBackendWorker();

if (IS_DEV || IS_PERF_BUILD) {
  import('perf-deets/frontend').then(({ listenForPerfData }) => {
    listenForPerfData(window);

    global.__startProfile = () => {
      window.postMessage({ type: '__perf-deets:start-profile' });
      worker.postMessage({ type: '__perf-deets:start-profile' });
    };
    global.__stopProfile = () => {
      window.postMessage({ type: '__perf-deets:stop-profile' });
      worker.postMessage({ type: '__perf-deets:stop-profile' });
    };
  });
}

global.Actual = {
  IS_DEV,
  ACTUAL_VERSION,
  IS_FAKE_WEB: true,
  IS_BETA: process.env.REACT_APP_RELEASE_TYPE === 'beta',

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
          cancelable: true
        })
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

  ipcConnect: () => {},
  getServerSocket: async () => {
    return worker;
  }
};

if (IS_DEV) {
  global.Actual.reloadBackend = () => {
    worker.postMessage({ type: '__actual:shutdown' });
    createBackendWorker();
  };
}

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey) {
    // Cmd/Ctrl+o
    if (e.keyCode === 79) {
      e.preventDefault();
      window.__actionsForMenu.closeBudget();
    }
    // Cmd/Ctrl+z
    else if (e.keyCode === 90) {
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
