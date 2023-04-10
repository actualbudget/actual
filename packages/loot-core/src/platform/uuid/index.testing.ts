import type * as T from '.';

export const v4: T.V4 = function () {
  return Promise.resolve(global.randomId());
};

export const v4Sync: T.V4Sync = function () {
  return global.randomId();
};
