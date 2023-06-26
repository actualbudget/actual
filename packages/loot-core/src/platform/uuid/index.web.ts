import uuid from 'uuid';

import type * as T from '.';

export let v4: T.V4 = function () {
  return Promise.resolve(uuid.v4());
};

export let v4Sync: T.V4Sync = function () {
  return uuid.v4();
};
