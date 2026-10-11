import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { breakpoints } from '#tokens';

import { useResponsive } from './useResponsive';

function setWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

function resizeWindow(width: number, height: number) {
  setWindowSize(width, height);
  window.dispatchEvent(new Event('resize'));
}

describe('useResponsive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setWindowSize(breakpoints.wide + 100, 800);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the current window size and breakpoints', () => {
    const { result } = renderHook(() => useResponsive());

    expect(result.current.width).toBe(breakpoints.wide + 100);
    expect(result.current.height).toBe(800);
    expect(result.current.isWideWidth).toBe(true);
    expect(result.current.atLeastMediumWidth).toBe(true);
    expect(result.current.isNarrowWidth).toBe(false);
  });

  // Every amount in every transaction row renders through a component that
  // calls this hook. Re-rendering each one shortly after it mounts flooded
  // React with updates while a virtualized list was scrolled, which
  // contributed to "Maximum update depth exceeded" crashes (#9170).
  it('does not re-render after mounting when the window size is unchanged', () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useResponsive();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(renders).toBe(1);
  });

  it('shares a single resize listener across instances', () => {
    const addListener = vi.spyOn(window, 'addEventListener');

    function Consumer() {
      useResponsive();
      return null;
    }
    const { unmount } = render(
      <>
        {Array.from({ length: 50 }, (_, i) => (
          <Consumer key={i} />
        ))}
      </>,
    );

    const resizeListeners = addListener.mock.calls.filter(
      ([type]) => type === 'resize',
    );
    expect(resizeListeners).toHaveLength(1);

    unmount();
    addListener.mockRestore();
  });

  it('updates after a resize once the debounce delay has passed', () => {
    const { result } = renderHook(() => useResponsive());

    act(() => {
      resizeWindow(breakpoints.small - 1, 600);
    });
    // Debounced: nothing changes immediately.
    expect(result.current.isNarrowWidth).toBe(false);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.width).toBe(breakpoints.small - 1);
    expect(result.current.height).toBe(600);
    expect(result.current.isNarrowWidth).toBe(true);
    expect(result.current.isSmallWidth).toBe(false);
  });

  it('coalesces a burst of resizes into one update', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useResponsive();
    });

    act(() => {
      resizeWindow(breakpoints.medium + 10, 700);
      vi.advanceTimersByTime(100);
      resizeWindow(breakpoints.small + 10, 700);
      vi.advanceTimersByTime(100);
      resizeWindow(breakpoints.medium - 1, 650);
      vi.advanceTimersByTime(250);
    });

    expect(renders).toBe(2);
    expect(result.current.width).toBe(breakpoints.medium - 1);
    expect(result.current.isSmallWidth).toBe(true);
  });

  it('does not re-render when a resize leaves the size unchanged', () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useResponsive();
    });

    act(() => {
      resizeWindow(breakpoints.wide + 100, 800);
      vi.advanceTimersByTime(250);
    });

    expect(renders).toBe(1);
  });

  it('removes the resize listener once the last instance unmounts', () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');

    const first = renderHook(() => useResponsive());
    const second = renderHook(() => useResponsive());

    first.unmount();
    expect(
      removeListener.mock.calls.filter(([type]) => type === 'resize'),
    ).toHaveLength(0);

    second.unmount();
    expect(
      removeListener.mock.calls.filter(([type]) => type === 'resize'),
    ).toHaveLength(1);

    removeListener.mockRestore();
  });

  it('picks up a resize that happened while nothing was mounted', () => {
    const first = renderHook(() => useResponsive());
    first.unmount();

    setWindowSize(breakpoints.small - 50, 500);

    const { result } = renderHook(() => useResponsive());
    expect(result.current.width).toBe(breakpoints.small - 50);
    expect(result.current.isNarrowWidth).toBe(true);
  });
});
