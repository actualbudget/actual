import { app, session } from 'electron';

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

  contents.on('will-navigate', event => {
    event.preventDefault();
  });
});

app.on('ready', function () {
  session.defaultSession.setPermissionRequestHandler(
    function (webContents, permission, callback) {
      const url = webContents.getURL();
      if (url.startsWith('file://')) {
        callback(true);
      } else {
        callback(false);
      }
    },
  );
});
