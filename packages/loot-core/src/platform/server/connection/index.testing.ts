import type * as T from '.';

let events = [];

export const init: T.Init = function () {};

export const send: T.Send = function (type, args) {
  events.push([type, args]);
};

export const getEvents: T.GetEvents = function () {
  return events;
};

export const resetEvents: T.ResetEvents = function () {
  events = [];
};
