import { runHandler, isMutating } from '../../../server/mutators';
import { captureException } from '../../exceptions';

import type * as T from '.';

// for some reason import doesn't work
const WebSocketServer = require('ws').Server;

// the websocket server
let wss = null;

function coerceError(error) {
  if (error.type && error.type === 'APIError') {
    return error;
  }

  return { type: 'InternalError', message: error.message };
}

export const init: T.Init = function (socketName, handlers) {
  wss = new WebSocketServer({ port: socketName });

  // websockets doesn't support sending objects so parse/stringify needed
  wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', data => {
      let msg = JSON.parse(data);

      if (ws.readyState !== 1) {
        return;
      }

      let { id, name, args, undoTag, catchErrors } = msg;

      if (handlers[name]) {
        runHandler(handlers[name], args, { undoTag, name }).then(
          result => {
            if (ws.readyState !== 1) {
              return;
            }
            if (catchErrors) {
              result = { data: result, error: null };
            }

            ws.send(
              JSON.stringify({
                type: 'reply',
                id,
                result,
                mutated:
                  isMutating(handlers[name]) &&
                  name !== 'undo' &&
                  name !== 'redo',
                undoTag,
              }),
            );
          },
          nativeError => {
            if (ws.readyState !== 1) {
              return;
            }
            let error = coerceError(nativeError);

            if (name.startsWith('api/')) {
              // The API is newer and does automatically forward
              // errors
              ws.send(JSON.stringify({ type: 'reply', id, error }));
            } else if (catchErrors) {
              ws.send(
                JSON.stringify({
                  type: 'reply',
                  id,
                  result: { error, data: null },
                }),
              );
            } else {
              ws.send(JSON.stringify({ type: 'error', id }));
            }

            if (error.type === 'InternalError' && name !== 'api/load-budget') {
              captureException(nativeError);
            }

            if (!catchErrors) {
              // Notify the frontend that something bad happend
              send('server-error');
            }
          },
        );
      } else {
        console.warn('Unknown method: ' + name);
        captureException(new Error('Unknown server method: ' + name));
        ws.send(
          JSON.stringify({
            type: 'reply',
            id,
            result: null,
            error: { type: 'APIError', message: 'Unknown method: ' + name },
          }),
        );
      }
    });
  });
};

export const getNumClients: T.GetNumClients = function () {
  if (wss) {
    return wss.clients.length;
  }

  return 0;
};

export const send: T.Send = function (name, args) {
  if (wss) {
    wss.clients.forEach(client =>
      client.send(JSON.stringify({ type: 'push', name, args })),
    );
  }
};
