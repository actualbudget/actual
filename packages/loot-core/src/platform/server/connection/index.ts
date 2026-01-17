// @ts-strict-ignore
import { APIError } from '../../../server/errors';
import { isMutating, runHandler } from '../../../server/mutators';
import { captureException } from '../../exceptions';
import { logger } from '../log';

import type * as T from './index-types';

function getGlobalObject() {
  const obj =
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
      const data = e.data;
      const msg = typeof data === 'string' ? JSON.parse(data) : data;

      if (msg.type && (msg.type === 'init' || msg.type.startsWith('__'))) {
        return;
      }

      if (msg.name === 'client-connected-to-backend') {
        // the client is indicating that it is connected to this backend. Stop attempting to connect
        logger.info('Backend: Client connected');
        clearInterval(reconnectToClientInterval);
        return;
      }

      const { id, name, args, undoTag, catchErrors } = msg;

      if (handlers[name]) {
        runHandler(handlers[name], args, { undoTag, name }).then(
          result => {
            serverChannel.postMessage({
              type: 'reply',
              id,
              result: catchErrors ? { data: result, error: null } : result,
              mutated: isMutating(handlers[name]),
              undoTag,
            });
          },
          nativeError => {
            const error = coerceError(nativeError);

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
        logger.warn('Unknown method: ' + name);
        serverChannel.postMessage({
          type: 'reply',
          id,
          result: null,
          error: APIError('Unknown method: ' + name),
        });
      }
    },
    false,
  );

  const RECONNECT_INTERVAL_MS = 200;
  const MAX_RECONNECT_ATTEMPTS = 500;
  let reconnectAttempts = 0;

  const reconnectToClientInterval = setInterval(() => {
    logger.info('Backend: Trying to connect to client');
    serverChannel.postMessage({ type: 'connect' });
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // Failed to connect to client - signal server error
      send('server-error');
      clearInterval(reconnectToClientInterval);
    }
  }, RECONNECT_INTERVAL_MS);
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

export const resetEvents: T.ResetEvents = function () {
  // resetEvents is used in tests to mock the server
};
