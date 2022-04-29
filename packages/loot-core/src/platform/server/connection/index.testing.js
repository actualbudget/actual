function init() {}

let events = [];

function send(type, args) {
  events.push([type, args]);
}

function resetEvents() {
  events = [];
}

module.exports = { init, send, resetEvents, getEvents: () => events };
