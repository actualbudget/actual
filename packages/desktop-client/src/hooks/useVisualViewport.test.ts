import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useVisualViewport } from './useVisualViewport';

afterEach(() => vi.unstubAllGlobals());

describe('useVisualViewport', () => {
  it('keeps zoomed dialogs within the visible area as the keyboard opens and pans', () => {
    // Safari page zoom reports an already scaled height in CSS pixels.
    const viewport = Object.assign(new EventTarget(), {
      height: 541,
      offsetTop: 0,
      scale: 1.5,
    });
    vi.stubGlobal('visualViewport', viewport);
    const { result, unmount } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ height: 541, offsetTop: 0 });

    act(() => {
      viewport.height = 310;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ height: 310, offsetTop: 0 });

    act(() => {
      viewport.offsetTop = 40;
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toEqual({ height: 310, offsetTop: 40 });

    act(() => {
      viewport.height = 541;
      viewport.offsetTop = 0;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ height: 541, offsetTop: 0 });

    const removeListener = vi.spyOn(viewport, 'removeEventListener');
    unmount();
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('uses the window height when the Visual Viewport API is unavailable', () => {
    vi.stubGlobal('visualViewport', undefined);
    vi.stubGlobal('innerHeight', 800);
    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ height: 800, offsetTop: 0 });
    act(() => {
      vi.stubGlobal('innerHeight', 600);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ height: 600, offsetTop: 0 });
  });
});
