// @ts-strict-ignore
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnVisible } from './useOnVisible';

const capacitorMocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  appStateListeners: [] as Array<(state: { isActive: boolean }) => void>,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: capacitorMocks.isNativePlatform },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(
      async (
        _event: string,
        listener: (state: { isActive: boolean }) => void,
      ) => {
        capacitorMocks.appStateListeners.push(listener);
        return {
          remove: async () => {
            capacitorMocks.appStateListeners =
              capacitorMocks.appStateListeners.filter(l => l !== listener);
          },
        };
      },
    ),
  },
}));

function dispatchAppStateChange(isActive: boolean) {
  capacitorMocks.appStateListeners.forEach(listener => listener({ isActive }));
}

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

  describe('in the native app', () => {
    beforeEach(() => {
      capacitorMocks.isNativePlatform.mockReturnValue(true);
    });

    afterEach(() => {
      capacitorMocks.isNativePlatform.mockReturnValue(false);
      capacitorMocks.appStateListeners = [];
    });

    it('invokes callback when the app becomes active', async () => {
      const callback = vi.fn();
      renderHook(() => useOnVisible(callback));
      await Promise.resolve();

      dispatchAppStateChange(false);
      expect(callback).not.toHaveBeenCalled();

      dispatchAppStateChange(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('removes the app state listener on unmount', async () => {
      const callback = vi.fn();
      const { unmount } = renderHook(() => useOnVisible(callback));
      await Promise.resolve();

      unmount();
      await Promise.resolve();
      dispatchAppStateChange(true);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
