import type * as T from '..';

let listeners = new Map();
let serverHandler = null;

export const initServer: T.InitServer = handlers => {
  serverHandler = msg => {
    let { name, args, catchErrors } = msg;
    if (handlers[name]) {
      return Promise.resolve().then(() => {
        let promise = handlers[name](args);

        if (catchErrors) {
          return promise.then(
            data => ({ data }),
            err => ({ error: { message: err.message } }),
          );
        }
        return promise;
      });
    }
  };
};

export const clearServer: T.ClearServer = async () => {
  serverHandler = null;
  listeners = new Map();
};

export const serverPush: T.ServerPush = (name, args) => {
  Promise.resolve().then(() => {
    const listens = listeners.get(name);
    if (listens) {
      listens.forEach(listener => {
        listener(args);
      });
    }
  });
};

export const send = async (name, args, { catchErrors = false } = {}) => {
  if (serverHandler) {
    return serverHandler({ name, args, catchErrors });
  } else {
    throw new Error('`send` called with no mock server installed');
  }
};

export const sendCatch = (name, args) => {
  return send(name, args, { catchErrors: true });
};

export const listen = (name, cb) => {
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
