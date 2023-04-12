import { runHandler, isMutating } from '../../../server/mutators';
import { captureException } from '../../exceptions';

import type * as T from '.';

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
  return obj as unknown as typeof globalThis & {
    __globalServerChannel: Window | null;
  };
}

getGlobalObject().__globalServerChannel = null;

function coerceError(error) {
  if (error.type && error.type === 'APIError') {
    return error;
  }

  return { type: 'InternalError', message: error.message };
}

export const init: T.Init = function (serverChn, handlers) {
  const serverChannel = serverChn as Window;
  getGlobalObject().__globalServerChannel = serverChannel;

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
              undoTag,
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
                result: { error, data: null },
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
          },
        );
      } else {
        console.warn('Unknown method: ' + name);
        serverChannel.postMessage({
          type: 'reply',
          id,
          result: null,
          error: { type: 'APIError', message: 'Unknown method: ' + name },
        });
      }
    },
    false,
  );

  serverChannel.postMessage({ type: 'connect' });
};

export const send: T.Send = function (name, args) {
  const { __globalServerChannel } = getGlobalObject();
  if (__globalServerChannel) {
    __globalServerChannel.postMessage({
      type: 'push',
      name,
      args,
    });
  }
};

export const getNumClients = function () {
  return 1;
};
