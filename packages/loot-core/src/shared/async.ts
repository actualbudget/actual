import { type HandlerFunctions } from '../types/handlers';

export function sequential<T extends HandlerFunctions>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const sequenceState = {
    running: null,
    queue: [],
  };

  function pump() {
    if (sequenceState.queue.length > 0) {
      const next = sequenceState.queue.shift();
      run(next.args, next.resolve, next.reject);
    } else {
      sequenceState.running = null;
    }
  }

  function run(args, resolve, reject) {
    sequenceState.running = fn.apply(null, args);

    sequenceState.running.then(
      val => {
        pump();
        resolve(val);
      },
      err => {
        pump();
        reject(err);
      },
    );
  }

  return (...args) => {
    if (!sequenceState.running) {
      return new Promise((resolve, reject) => {
        return run(args, resolve, reject);
      });
    } else {
      return new Promise((resolve, reject) => {
        sequenceState.queue.push({ resolve, reject, args });
      });
    }
  };
}

export function once<T extends HandlerFunctions>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let promise = null;
  return (...args) => {
    if (!promise) {
      promise = fn.apply(null, args).finally(() => {
        promise = null;
      });
      return promise;
    }

    return promise;
  };
}
