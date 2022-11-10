const ipc = require('node-ipc');

const { runHandler, isMutating } = require('../../../server/mutators');
const { captureException } = require('../../exceptions');

function coerceError(error) {
  if (error.type && error.type === 'APIError') {
    return error;
  }

  return { type: 'InternalError', message: error.message };
}

function init(socketName, handlers) {
  ipc.config.id = socketName;
  ipc.config.silent = true;

  ipc.serve(() => {
    ipc.server.on('message', (data, socket) => {
      let msg = data;
      let { id, name, args, undoTag, catchErrors } = msg;

      if (handlers[name]) {
        runHandler(handlers[name], args, { undoTag, name }).then(
          result => {
            if (catchErrors) {
              result = { data: result, error: null };
            }

            ipc.server.emit(socket, 'message', {
              type: 'reply',
              id,
              result,
              mutated:
                isMutating(handlers[name]) &&
                name !== 'undo' &&
                name !== 'redo',
              undoTag
            });
          },
          nativeError => {
            let error = coerceError(nativeError);

            if (name.startsWith('api/')) {
              // The API is newer and does automatically forward
              // errors
              ipc.server.emit(socket, 'message', { type: 'reply', id, error });
            } else if (catchErrors) {
              ipc.server.emit(socket, 'message', {
                type: 'reply',
                id,
                result: { error, data: null }
              });
            } else {
              ipc.server.emit(socket, 'message', { type: 'error', id });
            }

            if (error.type === 'InternalError' && name !== 'api/load-budget') {
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
        captureException(new Error('Unknown server method: ' + name));
        ipc.server.emit(socket, 'message', {
          type: 'reply',
          id,
          result: null,
          error: { type: 'APIError', message: 'Unknown method: ' + name }
        });
      }
    });
  });

  ipc.server.start();
}

function getNumClients() {
  return ipc.server.sockets.length;
}

function send(name, args) {
  if (ipc.server) {
    ipc.server.broadcast('message', { type: 'push', name, args });
  }
}

module.exports = { init, send, getNumClients };
