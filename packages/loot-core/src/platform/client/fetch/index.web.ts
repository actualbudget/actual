import { v4 as uuidv4 } from 'uuid';

import * as undo from '../undo';

import type * as T from '.';

let replyHandlers = new Map();
let listeners = new Map();
let messageQueue = [];
let socketClient = null;

function connectSocket(port, onOpen) {
  let client = new WebSocket('ws://localhost:' + port);

  client.onmessage = event => {
    const msg = JSON.parse(event.data);

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
  };

  client.onopen = event => {
    socketClient = client;
    // Send any messages that were queued while closed
    if (messageQueue.length > 0) {
      messageQueue.forEach(msg => {
        socketClient.send(msg);
      });
      messageQueue = [];
    }

    onOpen();
  };
}

export const init: T.Init = async function (socketName) {
  await clearServer();
  return new Promise(resolve => connectSocket(socketName, resolve));
};

export const send: T.Send = function (
  name,
  args,
  { catchErrors = false } = {},
) {
  return new Promise((resolve, reject) => {
    let id = uuidv4();
    replyHandlers.set(id, { resolve, reject });

    if (socketClient) {
      socketClient.send(
        JSON.stringify({
          id,
          name,
          args,
          undoTag: undo.snapshot(),
          catchErrors: !!catchErrors,
        }),
      );
    } else {
      messageQueue.push(
        JSON.stringify({
          id,
          name,
          args,
          undoTag: undo.snapshot(),
          catchErrors,
        }),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
};

export const sendCatch: T.SendCatch = function (name, args) {
  return send(name, args, { catchErrors: true });
};

export const listen: T.Listen = function (name, cb) {
  if (!listeners.get(name)) {
    listeners.set(name, []);
  }
  listeners.get(name).push(cb);

  return () => {
    let arr = listeners.get(name);
    if (arr) {
      listeners.set(
        name,
        arr.filter(cb_ => cb_ !== cb),
      );
    }
  };
};

export const unlisten: T.Unlisten = function (name) {
  listeners.set(name, []);
};

async function closeSocket(onClose) {
  socketClient.onclose = event => {
    socketClient = null;
    onClose();
  };

  await socketClient.close();
}

export const clearServer: T.ClearServer = async function () {
  if (socketClient != null) {
    return new Promise(closeSocket);
  }
};
