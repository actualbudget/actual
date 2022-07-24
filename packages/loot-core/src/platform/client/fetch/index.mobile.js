const uuid = require('../../uuid');

let serverThread;
let isReady = false;
let messageQueue = [];
let replyHandlers = new Map();
let listeners = new Map();

function init(thread) {
  serverThread = thread;

  serverThread.onmessage = message => {
    // Wait for the backend to initialize and become "ready"
    if (!isReady) {
      if (message.type === 'ready') {
        isReady = true;

        // Send any messages that were queued while we weren't ready
        if (messageQueue.length > 0) {
          messageQueue.forEach(msg => serverThread.postMessage(msg));
          messageQueue = [];
        }
      }
      return;
    }

    const msg = message;

    if (msg.type === 'error') {
      // An error happened while handling a message so cleanup the
      // current reply handler. We don't care about the actual error -
      // generic backend errors are handled separately and if you want
      // more specific handling you should manually forward the error
      // through a normal reply.
      const { id } = msg;
      replyHandlers.delete(id);
    } else if (msg.type === 'reply') {
      const { id, result } = msg;

      const handler = replyHandlers.get(id);
      if (handler) {
        replyHandlers.delete(id);
        handler.resolve(result);
      }
    } else if (msg.type === 'push') {
      const { name, args } = msg;

      const listens = listeners.get(name);
      if (listens) {
        listens.forEach(listener => {
          listener(args);
        });
      }
    } else {
      throw new Error('Unknown message type: ' + JSON.stringify(msg));
    }
  };
}

function send(name, args, { catchErrors = false } = {}) {
  return new Promise((resolve, reject) => {
    const id = uuid.v4Sync();
    replyHandlers.set(id, { resolve, reject });

    if (isReady) {
      serverThread.postMessage(JSON.stringify({ id, name, args, catchErrors }));
    } else {
      messageQueue.push(JSON.stringify({ id, name, args, catchErrors }));
    }
  });
}

function sendCatch(name, args) {
  return send(name, args, { catchErrors: true });
}

function listen(name, cb) {
  if (!listeners.get(name)) {
    listeners.set(name, []);
  }
  listeners.get(name).push(cb);

  return () => {
    let arr = listeners.get(name);
    listeners.set(
      name,
      arr.filter(cb_ => cb_ !== cb)
    );
  };
}

function unlisten(name) {
  listeners.set(name, []);
}

module.exports = { init, send, sendCatch, listen, unlisten };
