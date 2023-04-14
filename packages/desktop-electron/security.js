const electron = require('electron');

electron.app.on('web-contents-created', function (event, contents) {
  contents.on('will-attach-webview', function (event, webPreferences, params) {
    delete webPreferences.preloadURL;
    delete webPreferences.preload;

    webPreferences.nodeIntegration = false;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;
    webPreferences.enableBlinkFeatures = false;

    // For now, we never use <webview>. Just disable it entirely.
    event.preventDefault();
  });

  contents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
  });

  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

electron.app.on('ready', function () {
  electron.session.defaultSession.setPermissionRequestHandler(function (
    webContents,
    permission,
    callback,
  ) {
    var url = webContents.getURL();
    if (url.startsWith('file://')) {
      callback(true);
    } else {
      callback(false);
    }
  });
});
