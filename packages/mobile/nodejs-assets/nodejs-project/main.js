// Rename this sample file to main.js to use on your project.
// The main.js file will be overwritten in updates/reinstalls.

let rn_bridge = require('rn-bridge');

global.fetch = require('node-fetch');

let hasInitialized = false;

rn_bridge.channel.on('message', msg => {
  if (!hasInitialized) {
    msg = JSON.parse(msg);

    if (msg.type === 'init') {
      hasInitialized = true;
      let isDev = !!msg.dev;
      let version = msg.version;

      if (!isDev) {
        const sentry = require('./server-sentry');
        sentry.install();
      }

      process.env.ACTUAL_DATA_DIR = msg.dataDir;
      process.env.ACTUAL_DOCUMENT_DIR = msg.documentDir;

      let backend = require('./bundle.mobile.js');

      backend.initApp(version, isDev).then(() => {
        rn_bridge.channel.send(JSON.stringify({ type: 'ready' }));
      });
    }
  }
});
