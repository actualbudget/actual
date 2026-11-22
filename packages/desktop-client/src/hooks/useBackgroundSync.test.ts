import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBackgroundSync } from './useBackgroundSync';

// Returns whether the web app took the request, as the native apps see it.
function dispatchBackgroundSync(done: () => void) {
  return !window.dispatchEvent(
    new CustomEvent('actual-background-sync', {
      detail: done,
      cancelable: true,
    }),
  );
}

describe('useBackgroundSync', () => {
  it('reports back to the native app only once the callback has finished', async () => {
    let finishCallback: () => void = vi.fn();
    const callback = vi.fn(
      () => new Promise<void>(resolve => (finishCallback = resolve)),
    );
    const done = vi.fn();
    renderHook(() => useBackgroundSync(callback));

    dispatchBackgroundSync(done);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(done).not.toHaveBeenCalled();

    finishCallback();
    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  });

  it('reports back when the callback fails', async () => {
    const done = vi.fn();
    renderHook(() =>
      useBackgroundSync(() => Promise.reject(new Error('offline'))),
    );

    dispatchBackgroundSync(done);

    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  });

  it('tells the native app that it took the request', () => {
    renderHook(() => useBackgroundSync(() => Promise.resolve()));

    expect(dispatchBackgroundSync(vi.fn())).toBe(true);
  });

  it('leaves the request untaken after unmount', () => {
    const callback = vi.fn(() => Promise.resolve());
    const { unmount } = renderHook(() => useBackgroundSync(callback));

    unmount();

    expect(dispatchBackgroundSync(vi.fn())).toBe(false);
    expect(callback).not.toHaveBeenCalled();
  });
});
