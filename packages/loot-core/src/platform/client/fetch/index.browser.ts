import { v4 as uuidv4 } from 'uuid';

import { captureException, captureBreadcrumb } from '../../exceptions';
import * as undo from '../undo';

import type * as T from '.';

let replyHandlers = new Map();
let listeners = new Map();
let messageQueue = [];

let globalWorker = null;

class ReconstructedError extends Error {
  url: string;
  line: string;
  column: string;

  constructor(message, stack, url, line, column) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;

    Object.defineProperty(this, 'stack', {
      get: function () {
        return 'extended ' + this._stack;
      },
      set: function (value) {
        this._stack = value;
      },
    });

    this.stack = stack;
    this.url = url;
    this.line = line;
    this.column = column;
  }
}

function handleMessage(msg) {
  if (msg.type === 'error') {
    // An error happened while handling a message so cleanup the
    // current reply handler. We don't care about the actual error -
    // generic backend errors are handled separately and if you want
    // more specific handling you should manually forward the error
    // through a normal reply.
    const { id } = msg;
    replyHandlers.delete(id);
  } else if (msg.type === 'reply') {
    const { id, result, mutated, undoTag } = msg;

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
    // Ignore internal messages that start with __
    if (!msg.type.startsWith('__')) {
      throw new Error('Unknown message type: ' + JSON.stringify(msg));
    }
  }
}

// Note that this does not support retry. If the worker
// dies, it will permanently be disconnected. That should be OK since
// I don't think a worker should ever die due to a system error.
function connectWorker(worker, onOpen, onError) {
  globalWorker = worker;

  worker.onmessage = event => {
    let msg = event.data;

    // The worker implementation implements its own concept of a
    // 'connect' event because the worker is immediately
    // available, but we don't know when the backend is actually
    // ready to handle messages.
    if (msg.type === 'connect') {
      // Send any messages that were queued while closed
      if (messageQueue.length > 0) {
        messageQueue.forEach(msg => worker.postMessage(msg));
        messageQueue = null;
      }

      onOpen();
    } else if (msg.type === 'app-init-failure') {
      onError(msg);
    } else if (msg.type === 'capture-exception') {
      captureException(
        msg.stack
          ? new ReconstructedError(
              msg.message,
              msg.stack,
              msg.url,
              msg.line,
              msg.column,
            )
          : msg.exc,
      );

      if (msg.message && msg.message.includes('indexeddb-quota-error')) {
        alert(
          'We hit a limit on the local storage available. Edits may not be saved. Please get in touch https://actualbudget.org/contact/ so we can help debug this.',
        );
      }
    } else if (msg.type === 'capture-breadcrumb') {
      captureBreadcrumb(msg.data);
    } else {
      handleMessage(msg);
    }
  };

  // In browsers that don't support wasm in workers well (Safari),
  // we run the server on the main process for now. This might not
  // actually be a worker, but instead a message port which we
  // need to start.
  if (worker instanceof MessagePort) {
    worker.start();
  }
}

export const init: T.Init = async function (worker) {
  return new Promise((resolve, reject) =>
    connectWorker(worker, resolve, reject),
  );
};

export const send: T.Send = function (
  name,
  args,
  { catchErrors = false } = {},
) {
  return new Promise((resolve, reject) => {
    let id = uuidv4();

    replyHandlers.set(id, { resolve, reject });
    let message = {
      id,
      name,
      args,
      undoTag: undo.snapshot(),
      catchErrors,
    };
    if (messageQueue) {
      messageQueue.push(message);
    } else {
      globalWorker.postMessage(message);
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
    listeners.set(
      name,
      arr.filter(cb_ => cb_ !== cb),
    );
  };
};

export const unlisten: T.Unlisten = function (name) {
  listeners.set(name, []);
};

export const clearServer: T.ClearServer = async function () {
  //
};
