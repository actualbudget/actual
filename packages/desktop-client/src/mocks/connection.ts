// Minimal connection mock used by desktop-client component tests.
//
// This mirrors `@actual-app/core`'s test-only mock implementation so that
// `useSpreadsheet()` and other code paths can call `send()` and receive a
// promise with a stable shape.

type Listener = (args: unknown) => void;
type Handler = (args: unknown) => unknown | Promise<unknown>;

let listeners = new Map<string, Array<Listener>>();
let serverHandler:
  | null
  | ((msg: { name: string; args: unknown; catchErrors: boolean }) => unknown) =
  null;

export const initServer = (handlers: Record<string, Handler>) => {
  serverHandler = msg => {
    const { name, args, catchErrors } = msg;
    if (handlers[name]) {
      return Promise.resolve().then(() => {
        const promise = Promise.resolve(handlers[name](args));

        if (catchErrors) {
          return promise.then(
            data => ({ data }),
            error => ({ error }),
          );
        }

        return promise;
      });
    }
  };
};

export const clearServer = async () => {
  serverHandler = null;
  listeners = new Map();
};

export const serverPush = (name: string, args: unknown) => {
  void Promise.resolve().then(() => {
    const listens = listeners.get(name);
    if (listens) {
      listens.forEach(listener => {
        listener(args);
      });
    }
  });
};

export const send = async (
  name: string,
  args: unknown,
  { catchErrors = false } = {},
) => {
  if (serverHandler) {
    return serverHandler({ name, args, catchErrors });
  } else {
    throw new Error('`send` called with no mock server installed');
  }
};

export const sendCatch = (name: string, args: unknown) => {
  return send(name, args, { catchErrors: true });
};

export const listen = (name: string, cb: Listener) => {
  if (!listeners.get(name)) {
    listeners.set(name, []);
  }

  listeners.get(name)!.push(cb);

  return () => {
    const arr = listeners.get(name) ?? [];
    listeners.set(
      name,
      arr.filter(cb_ => cb_ !== cb),
    );
  };
};
