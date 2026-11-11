import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startOpfsKeepAlive } from './opfs-keep-alive';

const INTERVAL_MS = 1000;

// What a lookup rejects with once the browser has dropped its index
function notFound() {
  return new DOMException('could not be found', 'NotFoundError');
}

async function start(getDirectoryHandle: (name: string) => Promise<unknown>) {
  const getRoot = vi.fn(async () => ({ getDirectoryHandle }));
  const onLost = vi.fn();
  const keepAlive = await startOpfsKeepAlive({
    directoryName: 'actual',
    onLost,
    getRoot,
    intervalMs: INTERVAL_MS,
  });
  return { keepAlive, getRoot, onLost };
}

describe('OPFS keep-alive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('looks the directory up on every tick, through the root it took at the start', async () => {
    const getDirectoryHandle = vi.fn(async () => ({}));
    const { keepAlive, getRoot, onLost } = await start(getDirectoryHandle);
    expect(getDirectoryHandle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
    expect(getDirectoryHandle).toHaveBeenCalledTimes(3);
    // A plain lookup: nothing is created, and the root is never asked for
    // again, which is the call that deletes the files once the index is gone
    for (const call of getDirectoryHandle.mock.calls) {
      expect(call).toEqual(['actual']);
    }
    expect(getRoot).toHaveBeenCalledTimes(1);
    expect(onLost).not.toHaveBeenCalled();

    keepAlive.stop();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
    expect(getDirectoryHandle).toHaveBeenCalledTimes(3);
  });

  it('reports the loss once and stops looking', async () => {
    const getDirectoryHandle = vi
      .fn<(name: string) => Promise<unknown>>()
      .mockResolvedValueOnce({})
      .mockRejectedValue(notFound());
    const { keepAlive, onLost } = await start(getDirectoryHandle);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(onLost).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(onLost).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
    expect(getDirectoryHandle).toHaveBeenCalledTimes(2);
    expect(onLost).toHaveBeenCalledTimes(1);
    // And says so without looking again
    expect(await keepAlive.check()).toBe(false);
    expect(getDirectoryHandle).toHaveBeenCalledTimes(2);
  });

  it('concludes nothing from another kind of failure', async () => {
    const getDirectoryHandle = vi
      .fn<(name: string) => Promise<unknown>>()
      .mockRejectedValueOnce(new DOMException('busy', 'InvalidStateError'))
      .mockResolvedValue({});
    const { keepAlive, onLost } = await start(getDirectoryHandle);

    expect(await keepAlive.check()).toBe(true);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);
    expect(getDirectoryHandle).toHaveBeenCalledTimes(3);
    expect(onLost).not.toHaveBeenCalled();
    keepAlive.stop();
  });

  it('looks at once when asked, and reports a loss it finds', async () => {
    const getDirectoryHandle = vi
      .fn<(name: string) => Promise<unknown>>()
      .mockResolvedValueOnce({})
      .mockRejectedValue(notFound());
    const { keepAlive, onLost } = await start(getDirectoryHandle);

    expect(await keepAlive.check()).toBe(true);
    expect(onLost).not.toHaveBeenCalled();
    // Two at the same time, as a failed statement and a tick can be
    expect(await Promise.all([keepAlive.check(), keepAlive.check()])).toEqual([
      false,
      false,
    ]);
    expect(onLost).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
    expect(getDirectoryHandle).toHaveBeenCalledTimes(3);
  });

  it('does nothing when the root cannot be had', async () => {
    const onLost = vi.fn();
    const keepAlive = await startOpfsKeepAlive({
      directoryName: 'actual',
      onLost,
      getRoot: () => Promise.reject(new DOMException('no', 'SecurityError')),
      intervalMs: INTERVAL_MS,
    });

    expect(vi.getTimerCount()).toBe(0);
    expect(await keepAlive.check()).toBe(true);
    expect(onLost).not.toHaveBeenCalled();
    keepAlive.stop();
  });
});
