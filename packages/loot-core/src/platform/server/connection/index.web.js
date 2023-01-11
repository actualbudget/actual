const { runHandler, isMutating } = require('../../../server/mutators');
const { captureException } = require('../../exceptions');

function getGlobalObject() {
  let obj =
    typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : null;
  if (!obj) {
    throw new Error('Cannot get global object');
  }
  return obj;
}

getGlobalObject().__globalServerChannel = null;

function coerceError(error) {
  if (error.type && error.type === 'APIError') {
    return error;
  }

  return { type: 'InternalError', message: error.message };
}

function init(serverChannel, handlers) {
  getGlobalObject().__globalServerChannel = serverChannel;

  // eslint-disable-next-line
  serverChannel.addEventListener(
    'message',
    e => {
      let data = e.data;
      let msg = typeof data === 'string' ? JSON.parse(data) : data;

      if (msg.type && (msg.type === 'init' || msg.type.startsWith('__'))) {
        return;
      }

      let { id, name, args, undoTag, catchErrors } = msg;

      if (handlers[name]) {
        runHandler(handlers[name], args, { undoTag, name }).then(
          result => {
            if (catchErrors) {
              result = { data: result, error: null };
            }

            serverChannel.postMessage({
              type: 'reply',
              id,
              result,
              mutated: isMutating(handlers[name]),
              undoTag
            });
          },
          nativeError => {
            let error = coerceError(nativeError);

            if (name.startsWith('api/')) {
              // The API is newer and does automatically forward
              // errors
              serverChannel.postMessage({ type: 'reply', id, error });
            } else if (catchErrors) {
              serverChannel.postMessage({
                type: 'reply',
                id,
                result: { error, data: null }
              });
            } else {
              serverChannel.postMessage({ type: 'error', id });
            }

            // Only report internal errors
            if (error.type === 'InternalError') {
              captureException(nativeError);
            }

            if (!catchErrors) {
              // Notify the frontend that something bad happend
              send('server-error');
            }
          }
        );
      } else {
        console.warn('Unknown method: ' + name);
        serverChannel.postMessage({
          type: 'reply',
          id,
          result: null,
          error: { type: 'APIError', message: 'Unknown method: ' + name }
        });
      }
    },
    false
  );

  serverChannel.postMessage({ type: 'connect' });
}

function send(name, args) {
  if (getGlobalObject().__globalServerChannel) {
    getGlobalObject().__globalServerChannel.postMessage({
      type: 'push',
      name,
      args
    });
  }
}

function getNumClients() {
  return 1;
}

function tapIntoAPI() {}

module.exports = { init, send, getNumClients, tapIntoAPI };
