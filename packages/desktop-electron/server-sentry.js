let os = require('os');
let Sentry = require('@sentry/node');
let backend = require('loot-core/lib-dist/bundle.desktop.js');

function install(version) {
  Sentry.init({
    dsn: 'https://f2fa901455894dc8bf28210ef1247e2d@sentry.io/261029',
    release: version,
    tags: {
      process: process.type,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      platform: os.platform(),
      platform_release: os.release()
    },
    beforeSend: event => {
      process.send({ type: 'captureEvent', event });
      return null;
    },
    beforeBreadcrumb: breadcrumb => {
      process.send({ type: 'captureBreadcrumb', breadcrumb });
      return null;
    }
  });

  global.SentryClient = Sentry;
}

module.exports = { install };
