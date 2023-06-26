import type * as T from '..';

let listeners = new Map();
let serverHandler = null;

export let initServer: T.InitServer = handlers => {
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

export let clearServer: T.ClearServer = async () => {
  serverHandler = null;
  listeners = new Map();
};

export let serverPush: T.ServerPush = (name, args) => {
  Promise.resolve().then(() => {
    let listens = listeners.get(name);
    if (listens) {
      listens.forEach(listener => {
        listener(args);
      });
    }
  });
};

export let send = async (name, args, { catchErrors = false } = {}) => {
  if (serverHandler) {
    return serverHandler({ name, args, catchErrors });
  } else {
    throw new Error('`send` called with no mock server installed');
  }
};

export let sendCatch = (name, args) => {
  return send(name, args, { catchErrors: true });
};

export let listen = (name, cb) => {
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
