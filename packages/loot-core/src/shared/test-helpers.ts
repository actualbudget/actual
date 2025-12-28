import { logger } from '../platform/server/log';

export let tracer: null | ReturnType<typeof execTracer> = null;

function timeout<T extends Promise<unknown>>(promise: T, n: number) {
  let resolve: (response: string) => void;
  const timeoutPromise = new Promise<string>(_ => (resolve = _));
  const timer = setTimeout(() => resolve(`timeout(${n})`), n);

  return Promise.race([
    promise.then(res => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

export function resetTracer() {
  tracer = execTracer();
}

export function execTracer<T>() {
  const queue: Array<{ name: string; data?: T | undefined }> = [];
  let hasStarted = false;
  let waitingFor: null | {
    name: string;
    reject: (error: Error) => void;
    resolve: (data?: T) => void;
  } = null;
  let ended = false;

  const log = false;

  return {
    event(name: string, data?: T) {
      if (!hasStarted) {
        return;
      } else if (log) {
        logger.log(`--- event(${name}, ${JSON.stringify(data)}) ---`);
      }

      if (ended) {
        throw new Error(
          `Tracer received event but didn't expect it: ${name} with data: ${JSON.stringify(
            data,
          )}`,
        );
      } else if (waitingFor) {
        if (waitingFor.name !== name) {
          waitingFor.reject(
            new Error(
              `Event traced "${name}" but expected "${waitingFor.name}"`,
            ),
          );
        } else {
          waitingFor.resolve(data);
        }
        waitingFor = null;
      } else {
        queue.push({ name, data });
      }
    },

    wait(name: string) {
      if (waitingFor) {
        throw new Error(
          `Already waiting for ${waitingFor.name}, cannot wait for multiple events`,
        );
      }

      return new Promise((resolve, reject) => {
        waitingFor = { resolve, reject, name };
      });
    },

    expectWait(name: string, data?: T) {
      if (!hasStarted) {
        throw new Error(`Expected "${name}" but tracer hasn't started yet`);
      } else if (log) {
        logger.log(`--- expectWait(${name}) ---`);
      }

      const promise = this.wait(name);
      if (data === undefined) {
        // We want to ignore the result
        return expect(
          timeout(
            promise.then(() => true),
            1000,
          ),
        ).resolves.toEqual(true);
      }

      if (typeof data === 'function') {
        return expect(timeout(promise, 1000))
          .resolves.toBeTruthy()
          .then(() => promise)
          .then(res => data(res));
      } else {
        // We use this form because it tracks the right location in the
        // test when it fails. It's annoying to always write this in the
        // test though, so this provides a clean API. The right line
        // number in the test will show up in the stack.
        return expect(timeout(promise, 1000)).resolves.toEqual(data);
      }
    },

    expectNow(name: string, data?: T) {
      if (!hasStarted) {
        throw new Error(`Expected "${name}" but tracer hasn't started yet`);
      } else if (log) {
        logger.log(`--- expectNow(${name}) ---`);
      }

      const entry = queue.shift();

      if (!entry) {
        throw new Error(
          `Expected event "${name}" but none found - has it happened yet?`,
        );
      } else if (entry.name === name) {
        if (typeof data === 'function') {
          data(entry.data);
        } else {
          expect(entry.data).toEqual(data);
        }
      } else {
        throw new Error(
          `Event traced "${queue[0].name}" but expected "${name}"`,
        );
      }
    },

    expect(name: string, data?: T) {
      if (queue.length === 0) {
        return this.expectWait(name, data);
      }
      return this.expectNow(name, data);
    },

    start() {
      hasStarted = true;
    },

    end() {
      if (hasStarted && queue.length !== 0) {
        const str = queue.map(x => JSON.stringify(x));
        throw new Error(
          'Event tracer ended with existing events: ' + str.join('\n\n'),
        );
      }
      ended = true;
    },
  };
}
