let events = [];

export const init = function () {};

export const send = function (type, args) {
  events.push([type, args]);
};

export const getEvents = function () {
  return events;
};

export const resetEvents = function () {
  events = [];
};
