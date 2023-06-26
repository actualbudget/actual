import type * as T from '.';

let events = [];

export let init: T.Init = function () {};

export let send: T.Send = function (type, args) {
  events.push([type, args]);
};

export let getEvents: T.GetEvents = function () {
  return events;
};

export let resetEvents: T.ResetEvents = function () {
  events = [];
};
