export function sequential<T extends (...args: unknown[]) => unknown>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let sequenceState = {
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
    sequenceState.running = fn(...args);

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

export function once<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let promise = null;
  let onceFn = (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    if (!promise) {
      promise = fn(...args).finally(() => {
        promise = null;
      });
      return promise;
    }

    return promise;
  };

  return onceFn;
}
