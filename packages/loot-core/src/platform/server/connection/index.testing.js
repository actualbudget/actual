function init() {}

let events = [];

function send(type, args) {
  events.push([type, args]);
}

function resetEvents() {
  events = [];
}

export default { init, send, resetEvents, getEvents: () => events };
