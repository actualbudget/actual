import type { RefObject } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRefEventListener } from './useRefEventListener';

describe('useRefEventListener', () => {
  function makeMockElement() {
    return {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  }

  it('registers the listener once on mount', () => {
    const el = makeMockElement();
    const ref = { current: el } as unknown as RefObject<HTMLElement | null>;

    renderHook(() => useRefEventListener(ref, 'click', vi.fn()));

    expect(el.addEventListener).toHaveBeenCalledTimes(1);
    expect(el.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
    );
  });

  it('does not re-bind the native listener when only the callback identity changes', () => {
    const el = makeMockElement();
    const ref = { current: el } as unknown as RefObject<HTMLElement | null>;

    const { rerender } = renderHook(
      ({ callback }) => useRefEventListener(ref, 'click', callback),
      { initialProps: { callback: vi.fn() } },
    );

    expect(el.addEventListener).toHaveBeenCalledTimes(1);
    expect(el.removeEventListener).not.toHaveBeenCalled();

    // Simulate a caller passing a brand-new inline function every render.
    rerender({ callback: vi.fn() });
    rerender({ callback: vi.fn() });

    expect(el.addEventListener).toHaveBeenCalledTimes(1);
    expect(el.removeEventListener).not.toHaveBeenCalled();
  });

  it('always invokes the latest callback, even after a re-render', () => {
    const el = makeMockElement();
    const ref = { current: el } as unknown as RefObject<HTMLElement | null>;
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => useRefEventListener(ref, 'click', callback),
      { initialProps: { callback: firstCallback } },
    );

    rerender({ callback: secondCallback });

    const registeredListener = el.addEventListener.mock.calls[0][1];
    const event = { type: 'click' };
    registeredListener(event);

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith(event);
  });

  it('moves the listener when the ref points at a new element', () => {
    const el1 = document.createElement('button');
    const el2 = document.createElement('button');
    const callback = vi.fn();
    const ref: RefObject<HTMLElement | null> = { current: el1 };

    const { rerender } = renderHook(() =>
      useRefEventListener(ref, 'click', callback),
    );

    el1.dispatchEvent(new MouseEvent('click'));
    expect(callback).toHaveBeenCalledTimes(1);

    // Simulate the trigger element unmounting and a new one mounting,
    // e.g. a trigger button temporarily replaced by a rename input.
    ref.current = null;
    rerender();

    el1.dispatchEvent(new MouseEvent('click'));
    expect(callback).toHaveBeenCalledTimes(1);

    ref.current = el2;
    rerender();

    el1.dispatchEvent(new MouseEvent('click'));
    el2.dispatchEvent(new MouseEvent('click'));
    expect(callback).toHaveBeenCalledTimes(2);
    // The callback is invoked with the current element as `this`.
    expect(callback.mock.contexts).toEqual([el1, el2]);
  });

  it('rebinds when the event name changes', () => {
    const el = makeMockElement();
    const ref = { current: el } as unknown as RefObject<HTMLElement | null>;

    const { rerender } = renderHook<void, { event: 'click' | 'keyup' }>(
      ({ event }) => useRefEventListener(ref, event, vi.fn()),
      { initialProps: { event: 'click' } },
    );

    rerender({ event: 'keyup' });

    expect(el.addEventListener).toHaveBeenCalledTimes(2);
    expect(el.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const el = makeMockElement();
    const ref = { current: el } as unknown as RefObject<HTMLElement | null>;

    const { unmount } = renderHook(() =>
      useRefEventListener(ref, 'click', vi.fn()),
    );

    unmount();

    expect(el.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
