import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBackgroundSync } from './useBackgroundSync';

function dispatchBackgroundSync(done: () => void) {
  window.dispatchEvent(
    new CustomEvent('actual-background-sync', { detail: done }),
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

  it('stops listening after unmount', () => {
    const callback = vi.fn(() => Promise.resolve());
    const { unmount } = renderHook(() => useBackgroundSync(callback));

    unmount();
    dispatchBackgroundSync(vi.fn());

    expect(callback).not.toHaveBeenCalled();
  });
});
