import { sequential, once } from './async';

function timeout(n) {
  return new Promise(resolve => setTimeout(resolve, n));
}

function makeFunction(data) {
  return async function fn(n, { throwError } = {}) {
    data.push(n);
    await timeout(10);

    if (throwError) {
      throw new Error('throwing error');
    }

    data.push(n);
    await timeout(50);
    data.push(n);
  };
}

describe('async', () => {
  test('sequential fn should force concurrent calls to be in order', async () => {
    const test = async fn => {
      fn(1);
      fn(2);
      await fn(3);
    };

    const data = [];
    await test(makeFunction(data));
    expect(data).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);

    const seqData = [];
    await test(sequential(makeFunction(seqData)));
    expect(seqData).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);

    expect(data.length).toEqual(seqData.length);
  });

  test('sequential fn should always call function when queue is empty', async () => {
    const test = async fn => {
      await fn(1);
      await fn(2);
      await fn(3);
    };

    const data = [];
    await test(makeFunction(data));
    expect(data).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);

    const seqData = [];
    await test(sequential(makeFunction(seqData)));
    expect(seqData).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);

    expect(data.length).toEqual(seqData.length);
  });

  test('sequential fn should still flush queue when error is thrown', async () => {
    const test = async fn => {
      fn(1);
      fn(2, { throwError: true }).catch(err => {});
      await fn(3);
    };

    const data = [];
    await test(makeFunction(data));
    expect(data).toEqual([1, 2, 3, 1, 3, 1, 3]);

    const seqData = [];
    await test(sequential(makeFunction(seqData)));
    expect(seqData).toEqual([1, 1, 1, 2, 3, 3, 3]);

    expect(data.length).toEqual(seqData.length);
  });

  test('sequential fn should ignore promise chains in the future', async () => {
    const data = [];
    const fn = sequential(makeFunction(data));

    fn(1).then(() => {
      // The next call should already have started (so it should have
      // already appended 2 to the end). It shouldn't depend on this
      // promise chain at all (important part being that if any errors
      // happened in here, it wouldn't effect anything else)
      expect(data).toEqual([1, 1, 1, 2]);
    });
    fn(2, { throwError: true }).catch(err => {
      // Same as above
      expect(data).toEqual([1, 1, 1, 2, 3]);
    });
    await fn(3);

    expect(data).toEqual([1, 1, 1, 2, 3, 3, 3]);
  });

  test('once fn should only be called once', async () => {
    let timesCalled = 0;
    const fn = once(async () => {
      await timeout(200);
      timesCalled++;
    });

    await Promise.all([fn(), fn(), fn()]);

    // It should only have been called once
    expect(timesCalled).toBe(1);

    // Make sure it's called again now that it's done executing
    await Promise.all([fn(), fn()]);
    expect(timesCalled).toBe(2);
  });

  test('once fn should coalesce multiple calls', async () => {
    let timesCalled = 0;
    const fn = once(async () => {
      await timeout(200);
      timesCalled++;
      return {};
    });

    let results = await Promise.all([fn(), fn(), fn()]);

    // It should only have been called once
    expect(timesCalled).toBe(1);

    // The results should all be identical (`toBe` is a strict
    // comparison, like ===)
    expect(results[0]).toBe(results[1]);
    expect(results[0]).toBe(results[2]);
  });
});
