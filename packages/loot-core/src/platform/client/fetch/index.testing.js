let listeners = new Map();
let serverHandler = null;

module.exports.initServer = handlers => {
  serverHandler = msg => {
    let { name, args, catchErrors } = msg;
    if (handlers[name]) {
      return Promise.resolve().then(() => {
        let promise = handlers[name](args);

        if (catchErrors) {
          return promise.then(
            data => ({ data }),
            err => ({ error: { message: err.message } })
          );
        }
        return promise;
      });
    }
  };
};

module.exports.clearServer = () => {
  serverHandler = null;
  listeners = new Map();
};

module.exports.serverPush = (name, args) => {
  Promise.resolve().then(() => {
    const listens = listeners.get(name);
    if (listens) {
      listens.forEach(listener => {
        listener(args);
      });
    }
  });
};

module.exports.send = async function (
  name,
  args,
  { catchErrors = false } = {}
) {
  if (serverHandler) {
    return serverHandler({ name, args, catchErrors });
  } else {
    throw new Error('`send` called with no mock server installed');
  }
};

module.exports.sendCatch = function send(name, args) {
  return module.exports.send(name, args, { catchErrors: true });
};

module.exports.listen = function listen(name, cb) {
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
};
