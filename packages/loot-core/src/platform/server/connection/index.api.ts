import { logger } from '#platform/server/log';
import type { ServerEvents } from '#types/server-events';

import type * as T from './index-types';

export const init: T.Init = function () {
  // Nothing
};

// The API has no UI for server events; the two below mean synced data is
// parked on (or lost from) this device, so surface them to the script author
export const send: T.Send = function (type, args) {
  if (type !== 'sync-event' || !args) {
    return;
  }
  const event = args as ServerEvents['sync-event'];
  if (event.type === 'deferred-messages') {
    logger.warn(
      'Some synced changes were made with a newer version of Actual and will apply once @actual-app/api is updated',
    );
  } else if (event.type === 'dropped-messages') {
    logger.warn(
      'Some changes made on another device could not be applied on this device, so your data may differ',
    );
  }
};

export const getNumClients: T.GetNumClients = function () {
  return 1;
};
