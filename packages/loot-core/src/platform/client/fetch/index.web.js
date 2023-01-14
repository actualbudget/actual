const uuid = require('../../uuid');
const undo = require('../undo');
let replyHandlers = new Map();
let listeners = new Map();
let messageQueue = [];
let socketClient = null;

function connectSocket(name, onOpen) {
  global.Actual.ipcConnect(name, function (client) {
    client.on('message', data => {
      const msg = data;

      if (msg.type === 'error') {
        // An error happened while handling a message so cleanup the
        // current reply handler. We don't care about the actual error -
        // generic backend errors are handled separately and if you want
        // more specific handling you should manually forward the error
        // through a normal reply.
        const { id } = msg;
        replyHandlers.delete(id);
      } else if (msg.type === 'reply') {
        let { id, result, mutated, undoTag } = msg;

        // Check if the result is a serialized buffer, and if so
        // convert it to a Uint8Array. This is only needed when working
        // with node; the web version connection layer automatically
        // supports buffers
        if (result && result.type === 'Buffer' && Array.isArray(result.data)) {
          result = new Uint8Array(result.data);
        }

        const handler = replyHandlers.get(id);
        if (handler) {
          replyHandlers.delete(id);

          if (!mutated) {
            undo.gc(undoTag);
          }

          handler.resolve(result);
        }
      } else if (msg.type === 'push') {
        const { name, args } = msg;

        const listens = listeners.get(name);
        if (listens) {
          for (let i = 0; i < listens.length; i++) {
            let stop = listens[i](args);
            if (stop === true) {
              break;
            }
          }
        }
      } else {
        throw new Error('Unknown message type: ' + JSON.stringify(msg));
      }
    });

    client.on('connect', () => {
      socketClient = client;

      // Send any messages that were queued while closed
      if (messageQueue.length > 0) {
        messageQueue.forEach(msg => client.emit('message', msg));
        messageQueue = [];
      }

      onOpen();
    });

    client.on('disconnect', () => {
      socketClient = null;
    });
  });
}

module.exports.init = async function init(socketName) {
  return new Promise(resolve => connectSocket(socketName, resolve));
};

module.exports.send = function send(name, args, { catchErrors = false } = {}) {
  return new Promise((resolve, reject) => {
    uuid.v4().then(id => {
      replyHandlers.set(id, { resolve, reject });

      if (socketClient) {
        socketClient.emit('message', {
          id,
          name,
          args,
          undoTag: undo.snapshot(),
          catchErrors: !!catchErrors
        });
      } else {
        messageQueue.push({
          id,
          name,
          args,
          undoTag: undo.snapshot(),
          catchErrors
        });
      }
    });
  });
};

module.exports.sendCatch = function sendCatch(name, args) {
  return module.exports.send(name, args, { catchErrors: true });
};

module.exports.listen = function listen(name, cb) {
  if (!listeners.get(name)) {
    listeners.set(name, []);
  }
  listeners.get(name).push(cb);

  return () => {
    let arr = listeners.get(name);
    if (arr) {
      listeners.set(
        name,
        arr.filter(cb_ => cb_ !== cb)
      );
    }
  };
};

module.exports.unlisten = function unlisten(name) {
  listeners.set(name, []);
};
