let path = require('path');
let rn_bridge = require('rn-bridge');
let Sentry = require('@sentry/node');
// const connection = require('loot-core/lib-node/platform/server/connection');

let __rootdir__ = __dirname || process.cwd();

function install() {
  Sentry.init({
    dsn: 'https://45f67076016a4fe7bd2af69c4d37afba@sentry.io/1364085',
    beforeSend: event => {
      var stacktrace = event.exception && event.exception.values[0].stacktrace;

      if (stacktrace && stacktrace.frames) {
        stacktrace.frames.forEach(function(frame) {
          if (frame.filename.startsWith('/')) {
            frame.filename =
              'app:///' + path.relative(__rootdir__, frame.filename);
          }
        });
      }

      rn_bridge.channel.send(
        JSON.stringify({ type: 'internal', subtype: 'captureEvent', event })
      );

      return null;
    },
    beforeBreadcrumb: breadcrumb => {
      // Forward it
      rn_bridge.channel.send(
        JSON.stringify({
          type: 'internal',
          subtype: 'captureBreadcrumb',
          breadcrumb
        })
      );
      return null;
    }
  });

  global.SentryClient = Sentry;
}

module.exports = { install };
