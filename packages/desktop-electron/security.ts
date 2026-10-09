import { app, session } from 'electron';

import { isPermissionAllowed } from './trusted-url';

const isDev = process.env.EXECUTION_CONTEXT !== 'playwright' && !app.isPackaged;

app.on('web-contents-created', function (event, contents) {
  contents.on('will-attach-webview', function (event, webPreferences) {
    delete webPreferences.preload;

    webPreferences.nodeIntegration = false;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;

    // For now, we never use <webview>. Just disable it entirely.
    event.preventDefault();
  });

  contents.on('will-navigate', event => event.preventDefault());
  contents.on('will-redirect', event => event.preventDefault());
});

app.on('ready', function () {
  session.defaultSession.setPermissionRequestHandler(
    function (webContents, permission, callback) {
      callback(isPermissionAllowed(permission, webContents.getURL(), isDev));
    },
  );
});
