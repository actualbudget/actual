// @ts-strict-ignore
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingSyncPolling } from './usePendingSyncPolling';

function setVisibilityState(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('usePendingSyncPolling', () => {
  const originalVisibilityState = document.visibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    setVisibilityState('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibilityState(originalVisibilityState);
    vi.clearAllMocks();
  });

  it('polls immediately and on an interval when enabled', async () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      usePendingSyncPolling({ enabled: true, intervalMs: 1000, onPoll }),
    );

    expect(onPoll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it('does not poll when disabled', async () => {
    const onPoll = vi.fn();

    renderHook(() =>
      usePendingSyncPolling({ enabled: false, intervalMs: 1000, onPoll }),
    );

    await vi.advanceTimersByTimeAsync(3000);
    expect(onPoll).not.toHaveBeenCalled();
  });

  it('does not poll while the document is hidden', async () => {
    const onPoll = vi.fn();
    setVisibilityState('hidden');

    renderHook(() =>
      usePendingSyncPolling({ enabled: true, intervalMs: 1000, onPoll }),
    );

    await vi.advanceTimersByTimeAsync(3000);
    expect(onPoll).not.toHaveBeenCalled();
  });

  it('does not overlap polls while a previous one is still running', async () => {
    let resolvePoll: () => void;
    const onPoll = vi.fn().mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolvePoll = resolve;
        }),
    );

    renderHook(() =>
      usePendingSyncPolling({ enabled: true, intervalMs: 1000, onPoll }),
    );

    expect(onPoll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    expect(onPoll).toHaveBeenCalledTimes(1);

    resolvePoll();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onPoll).toHaveBeenCalledTimes(2);
  });
});
