/**
 * Tauri preload injection script.
 *
 * This script is injected into the webview via window.eval() before the
 * page JavaScript runs. It sets up the `window.Actual` API that the
 * desktop-client expects, bridging to Tauri's IPC system.
 *
 * Unlike the TypeScript `tauri-preload.ts`, this uses raw
 * __TAURI_INTERNALS__ to avoid requiring module bundling.
 */
(function () {
  'use strict';

  // Tauri's internal IPC invoke function
  function invoke(cmd, args) {
    if (window.__TAURI_INTERNALS__) {
      return window.__TAURI_INTERNALS__.invoke(cmd, args);
    }
    return Promise.reject(new Error('Tauri IPC not available'));
  }

  // Tauri event listener
  var eventListeners = {};
  var eventId = 0;

  function listen(eventName, handler) {
    if (window.__TAURI_INTERNALS__) {
      var id = eventId++;
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push({ id: id, handler: handler });

      // Use Tauri's plugin:event system
      window.__TAURI_INTERNALS__
        .invoke('plugin:event|listen', {
          event: eventName,
          target: { kind: 'Any' },
        })
        .then(function (unlistenId) {
          // Store unlisten ID for cleanup
        });
    }
  }

  // Process incoming Tauri events
  if (window.__TAURI_INTERNALS__) {
    var origHandler = window.__TAURI_INTERNALS__._handleEvent;
    window.__TAURI_INTERNALS__._handleEvent = function (event) {
      if (origHandler) origHandler(event);
      var listeners = eventListeners[event.event];
      if (listeners) {
        for (var i = 0; i < listeners.length; i++) {
          listeners[i].handler({ payload: event.payload });
        }
      }
    };
  }

  var IS_DEV = true; // Will be updated asynchronously
  var ACTUAL_VERSION = '0.0.0';

  // Fetch bootstrap data
  invoke('get_bootstrap_data')
    .then(function (data) {
      IS_DEV = data.isDev;
      ACTUAL_VERSION = data.version;
      if (window.Actual) {
        window.Actual.IS_DEV = data.isDev;
        window.Actual.ACTUAL_VERSION = data.version;
      }
    })
    .catch(function () {});

  window.Actual = {
    IS_DEV: IS_DEV,
    ACTUAL_VERSION: ACTUAL_VERSION,

    logToTerminal: function () {
      console.log.apply(console, arguments);
    },

    ipcConnect: function (func) {
      func({
        on: function (name, handler) {
          listen(name, function (event) {
            handler(event.payload);
          });
          if (name === 'message') {
            listen('message', function (event) {
              handler(event.payload);
            });
          }
          return { on: function () {}, emit: function () {} };
        },
        emit: function (name, data) {
          invoke('relay_message', { name: name, args: data });
        },
      });
    },

    startSyncServer: function () {
      return invoke('start_sync_server');
    },
    stopSyncServer: function () {
      return invoke('stop_sync_server');
    },
    isSyncServerRunning: function () {
      return invoke('is_sync_server_running');
    },
    startOAuthServer: function () {
      return invoke('start_oauth_server');
    },

    relaunch: function () {
      invoke('relaunch');
    },

    restartElectronServer: function () {
      invoke('restart_server');
    },

    openFileDialog: function (opts) {
      return invoke('open_file_dialog', { opts: opts });
    },

    saveFile: function (contents, filename, dialogTitle) {
      var fileContents;
      if (typeof contents === 'string') {
        fileContents = Array.from(new TextEncoder().encode(contents));
      } else {
        fileContents = Array.from(new Uint8Array(contents));
      }
      return invoke('save_file_dialog', {
        title: dialogTitle,
        defaultPath: filename,
        fileContents: fileContents,
      });
    },

    openURLInBrowser: function (url) {
      invoke('open_external_url', { url: url });
    },

    openInFileManager: function (filepath) {
      invoke('open_in_file_manager', { filepath: filepath });
    },

    onEventFromMain: function (type, handler) {
      listen(type, function (event) {
        handler(event.payload);
      });
    },

    isUpdateReadyForDownload: function () {
      return false;
    },
    waitForUpdateReadyForDownload: function () {
      return new Promise(function () {});
    },

    getServerSocket: function () {
      return Promise.resolve(null);
    },

    setTheme: function (theme) {
      invoke('set_theme', { theme: theme });
    },

    moveBudgetDirectory: function (currentBudgetDirectory, newDirectory) {
      return invoke('move_budget_directory', {
        from: currentBudgetDirectory,
        to: newDirectory,
      });
    },

    reload: function () {
      return Promise.reject(new Error('Reload not implemented in Tauri app'));
    },

    applyAppUpdate: function () {
      return Promise.reject(
        new Error('applyAppUpdate not implemented in Tauri app'),
      );
    },
  };
})();
