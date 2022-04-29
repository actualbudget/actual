const { runHandler } = require('../../../server/mutators');
let { captureException } = require('../../exceptions');
let rn_bridge = require('rn-bridge');

function coerceError(error) {
  if (error.type && error.type === 'APIError') {
    return error;
  }

  return { type: 'InternalError', message: error.message };
}

function init(_, handlers) {
  rn_bridge.channel.on('message', msg => {
    msg = JSON.parse(msg);

    if (msg.type === 'init') {
      rn_bridge.channel.send(JSON.stringify({ type: 'ready' }));
      return;
    }

    let { id, name, args, url, catchErrors } = msg;

    if (handlers[name]) {
      runHandler(handlers[name], args, { url, name }).then(
        result => {
          if (catchErrors) {
            result = { data: result, error: null };
          }

          rn_bridge.channel.send(JSON.stringify({ type: 'reply', id, result }));
        },
        nativeError => {
          let error = coerceError(nativeError);

          // See index.electron.js to explain this
          if (name.startsWith('api/')) {
            rn_bridge.channel.send(
              JSON.stringify({ type: 'reply', id, error })
            );
          } else if (catchErrors) {
            rn_bridge.channel.send(
              JSON.stringify({
                type: 'reply',
                id,
                result: { data: null, error }
              })
            );
          } else {
            rn_bridge.channel.send(JSON.stringify({ type: 'error', id }));
          }

          // Only report internal errors
          if (error.type === 'InternalError') {
            captureException(nativeError);
          }
        }
      );
    } else {
      console.warn('Unknown method: ' + name);
      rn_bridge.channel.send(
        JSON.stringify({
          type: 'reply',
          id,
          result: null,
          error: { type: 'APIError', message: 'Unknown method: ' + name }
        })
      );
    }
  });
}

function getNumClients() {
  return 1;
}

function send(name, args) {
  rn_bridge.channel.send(JSON.stringify({ type: 'push', name, args }));
}

function tapIntoAPI() {}

export default { init, send, getNumClients, tapIntoAPI };
