// @ts-strict-ignore
import { type HandlerFunctions } from '../types/handlers';

export function sequential<T extends HandlerFunctions>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const sequenceState: {
    running: Promise<Awaited<ReturnType<T>>> | null;
    queue: Array<{ args: Parameters<T>; resolve; reject }>;
  } = {
    running: null,
    queue: [],
  };

  function pump() {
    const next = sequenceState.queue.shift();
    if (next !== undefined) {
      run(next.args, next.resolve, next.reject);
    } else {
      sequenceState.running = null;
    }
  }

  function run(args: Parameters<T>, resolve, reject) {
    sequenceState.running = fn.apply(null, args).then(
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
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> | null {
  let promise: Promise<Awaited<ReturnType<T>>> | null = null;
  return (...args: Parameters<T>) => {
    if (!promise) {
      promise = fn.apply(null, args).finally(() => {
        promise = null;
      });
      return promise;
    }

    return promise;
  };
}
