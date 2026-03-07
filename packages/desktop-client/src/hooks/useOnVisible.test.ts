import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnVisible } from './useOnVisible';

function setVisibilityState(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    value,
    configurable: true,
    writable: true,
  });
}

function dispatchVisibilityChange() {
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useOnVisible', () => {
  const originalVisibilityState = document.visibilityState;

  beforeEach(() => {
    setVisibilityState('visible');
  });

  afterEach(() => {
    setVisibilityState(originalVisibilityState);
    vi.clearAllMocks();
  });

  it('invokes callback when document becomes visible', () => {
    const callback = vi.fn();
    renderHook(() => useOnVisible(callback));

    dispatchVisibilityChange();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not invoke callback when visibilityState is hidden', () => {
    const callback = vi.fn();
    renderHook(() => useOnVisible(callback));

    setVisibilityState('hidden');
    dispatchVisibilityChange();

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not attach listener when isEnabled is false', () => {
    const callback = vi.fn();
    renderHook(() => useOnVisible(callback, { isEnabled: false }));

    dispatchVisibilityChange();

    expect(callback).not.toHaveBeenCalled();
  });

  it('stops invoking callback after unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useOnVisible(callback));

    unmount();
    dispatchVisibilityChange();

    expect(callback).not.toHaveBeenCalled();
  });

  it('invokes callback on every visibilitychange when visibilityState is visible', async () => {
    const callback = vi.fn();
    renderHook(() => useOnVisible(callback));

    dispatchVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    dispatchVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does not invoke callback again until previous async callback completes', async () => {
    let resolve: () => void;
    const callback = vi.fn().mockImplementation(
      () =>
        new Promise<void>(r => {
          resolve = r;
        }),
    );
    renderHook(() => useOnVisible(callback));

    dispatchVisibilityChange();
    dispatchVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(1);

    resolve();
    await Promise.resolve();
    dispatchVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('invokes callback when isEnabled is true by default', () => {
    const callback = vi.fn();
    renderHook(() => useOnVisible(callback));

    dispatchVisibilityChange();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
