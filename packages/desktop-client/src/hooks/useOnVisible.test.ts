// @ts-strict-ignore
import type * as Platform from '@actual-app/core/shared/platform';
import { App as CapacitorApp } from '@capacitor/app';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnVisible } from './useOnVisible';

const { platform, removeListener } = vi.hoisted(() => ({
  platform: { isNativeMobileApp: false },
  removeListener: vi.fn(),
}));

vi.mock('@actual-app/core/shared/platform', async importOriginal => ({
  ...(await importOriginal<typeof Platform>()),
  get isNativeMobileApp() {
    return platform.isNativeMobileApp;
  },
}));
vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(async () => ({ remove: removeListener })) },
}));

function dispatchAppStateChange(isActive: boolean) {
  const [, listener] = vi.mocked(CapacitorApp.addListener).mock
    .calls[0] as unknown as [string, (state: { isActive: boolean }) => void];
  listener({ isActive });
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
      platform.isNativeMobileApp = true;
    });

    afterEach(() => {
      platform.isNativeMobileApp = false;
    });

    it('invokes callback when the app becomes active', () => {
      const callback = vi.fn();
      renderHook(() => useOnVisible(callback));

      dispatchAppStateChange(false);
      expect(callback).not.toHaveBeenCalled();

      dispatchAppStateChange(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('ignores visibilitychange so a resume only runs the callback once', () => {
      const callback = vi.fn();
      renderHook(() => useOnVisible(callback));

      dispatchVisibilityChange();

      expect(callback).not.toHaveBeenCalled();
    });

    it('removes the app state listener on unmount', async () => {
      const { unmount } = renderHook(() => useOnVisible(vi.fn()));

      unmount();
      await Promise.resolve();

      expect(removeListener).toHaveBeenCalledTimes(1);
    });
  });
});
