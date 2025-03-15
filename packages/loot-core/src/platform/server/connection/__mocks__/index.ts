import type * as T from '../index.d';

let events = [];

export const init: T.Init = function () {};

export const send: T.Send = function (type, args) {
  events.push([type, args]);
};

export const resetEvents: T.ResetEvents = function () {
  events = [];
};
