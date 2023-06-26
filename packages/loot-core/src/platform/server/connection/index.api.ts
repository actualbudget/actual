import type * as T from '.';

export let init: T.Init = function () {};

export let send: T.Send = function (type, args) {
  // Nothing
};

export let getNumClients: T.GetNumClients = function () {
  return 1;
};
