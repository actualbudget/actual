export let tracer = null;

function timeout(promise, n) {
  let resolve;
  let timeoutPromise = new Promise(_ => (resolve = _));
  let timer = setTimeout(() => resolve(`timeout(${n})`), n);

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

export function execTracer() {
  let queue = [];
  let hasStarted = false;
  let waitingFor = null;
  let ended = false;

  let log = false;

  return {
    event(name: string, data?: unknown) {
      if (!hasStarted) {
        return;
      } else if (log) {
        console.log(`--- event(${name}, ${JSON.stringify(data)}) ---`);
      }

      if (ended) {
        throw new Error(
          `Tracer received event but didn’t expect it: ${name} with data: ${JSON.stringify(
            data,
          )}`,
        );
      } else if (waitingFor) {
        if (waitingFor.name !== name) {
          waitingFor.reject(
            new Error(
              `Event traced “${name}” but expected “${waitingFor.name}”`,
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

    wait(name) {
      if (waitingFor) {
        throw new Error(
          `Already waiting for ${waitingFor.name}, cannot wait for multiple events`,
        );
      }

      return new Promise((resolve, reject) => {
        waitingFor = { resolve, reject, name };
      });
    },

    expectWait(name, data) {
      if (!hasStarted) {
        throw new Error(`Expected “${name}” but tracer hasn’t started yet`);
      } else if (log) {
        console.log(`--- expectWait(${name}) ---`);
      }

      let promise = this.wait(name);
      if (data === undefined) {
        // We want to ignore the result
        promise = promise.then(() => true);
        data = true;
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

    expectNow(name, data) {
      if (!hasStarted) {
        throw new Error(`Expected “${name}” but tracer hasn’t started yet`);
      } else if (log) {
        console.log(`--- expectNow(${name}) ---`);
      }

      if (queue.length === 0) {
        throw new Error(
          `Expected event “${name}” but none found - has it happened yet?`,
        );
      } else if (queue[0].name === name) {
        let entry = queue.shift();

        if (typeof data === 'function') {
          data(entry.data);
        } else {
          expect(entry.data).toEqual(data);
        }
      } else {
        throw new Error(
          `Event traced “${queue[0].name}” but expected “${name}”`,
        );
      }
    },

    expect(name: string, data?: unknown) {
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
        let str = queue.map(x => JSON.stringify(x));
        throw new Error(
          'Event tracer ended with existing events: ' + str.join('\n\n'),
        );
      }
      ended = true;
    },
  };
}
