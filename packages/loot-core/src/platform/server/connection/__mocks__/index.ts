import type * as T from '../index-types';

let events = [];

export const init: T.Init = function () {
  // No need to initialise in tests
};

export const send: T.Send = function (type, args) {
  events.push([type, args]);
};

export const resetEvents: T.ResetEvents = function () {
  events = [];
};
