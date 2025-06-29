// @ts-strict-ignore
import { APIError } from '../../../server/errors';
import { runHandler, isMutating } from '../../../server/mutators';
import { captureException } from '../../exceptions';

import type * as T from './index-types';

function coerceError(error) {
  if (error.type && error.type === 'APIError') {
    return error;
  }

  return { type: 'InternalError', message: error.message };
}

export const init: T.Init = function (_socketName, handlers) {
  process.parentPort.on('message', ({ data }) => {
    const { id, name, args, undoTag, catchErrors } = data;

    if (handlers[name]) {
      runHandler(handlers[name], args, { undoTag, name }).then(
        result => {
          if (catchErrors) {
            result = { data: result, error: null };
          }

          process.parentPort.postMessage({
            type: 'reply',
            id,
            result,
            mutated:
              isMutating(handlers[name]) && name !== 'undo' && name !== 'redo',
            undoTag,
          });
        },
        nativeError => {
          const error = coerceError(nativeError);

          if (name.startsWith('api/')) {
            // The API is newer and does automatically forward
            // errors
            process.parentPort.postMessage({
              type: 'reply',
              id,
              error,
            });
          } else if (catchErrors) {
            process.parentPort.postMessage({
              type: 'reply',
              id,
              result: { error, data: null },
            });
          } else {
            process.parentPort.postMessage({ type: 'error', id });
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
      process.parentPort.postMessage({
        type: 'reply',
        id,
        result: null,
        error: APIError('Unknown method: ' + name),
      });
    }
  });
};

export const getNumClients: T.GetNumClients = function () {
  return 0;
};

export const send: T.Send = function (name, args) {
  process.parentPort.postMessage({ type: 'push', name, args });
};

export const resetEvents: T.ResetEvents = function () {};
