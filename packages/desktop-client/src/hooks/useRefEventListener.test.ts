import { createElement, useRef } from 'react';
import type { RefObject } from 'react';

import { render, renderHook, screen } from '@testing-library/react';
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

  it('rebinds when the ref points at a different element', () => {
    const first = makeMockElement();
    const second = makeMockElement();
    const ref = { current: first } as unknown as RefObject<HTMLElement | null>;

    const { rerender } = renderHook(() =>
      useRefEventListener(ref, 'click', vi.fn()),
    );

    ref.current = second as unknown as HTMLElement;
    rerender();

    expect(first.removeEventListener).toHaveBeenCalledTimes(1);
    expect(second.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('unbinds while the ref is empty and rebinds when it fills again', () => {
    const first = makeMockElement();
    const second = makeMockElement();
    const ref = { current: first } as unknown as RefObject<HTMLElement | null>;

    const { rerender, unmount } = renderHook(() =>
      useRefEventListener(ref, 'click', vi.fn()),
    );

    ref.current = null;
    rerender();

    expect(first.removeEventListener).toHaveBeenCalledTimes(1);

    ref.current = second as unknown as HTMLElement;
    rerender();

    expect(second.addEventListener).toHaveBeenCalledTimes(1);

    unmount();

    expect(second.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('binds an element that only appears after the first render', () => {
    const el = makeMockElement();
    const ref = { current: null } as unknown as RefObject<HTMLElement | null>;

    const { rerender } = renderHook(() =>
      useRefEventListener(ref, 'click', vi.fn()),
    );

    expect(el.addEventListener).not.toHaveBeenCalled();

    ref.current = el as unknown as HTMLElement;
    rerender();

    expect(el.addEventListener).toHaveBeenCalledTimes(1);
  });

  // Every transaction row uses this hook. An extra render on mount queues
  // work for each row the virtualized list mounts while scrolling, which
  // kept React's nested-update counter climbing until it crashed (#9170).
  it('does not schedule an extra render when it binds on mount', () => {
    const el = makeMockElement();
    const ref = { current: el } as unknown as RefObject<HTMLElement | null>;
    let renders = 0;

    renderHook(() => {
      renders++;
      useRefEventListener(ref, 'click', vi.fn());
    });

    expect(el.addEventListener).toHaveBeenCalledTimes(1);
    expect(renders).toBe(1);
  });

  it('does not schedule an extra render when the ref is empty on mount', () => {
    const ref = { current: null } as unknown as RefObject<HTMLElement | null>;
    let renders = 0;

    renderHook(() => {
      renders++;
      useRefEventListener(ref, 'click', vi.fn());
    });

    expect(renders).toBe(1);
  });

  it('does not schedule an extra render when it rebinds to a new element', () => {
    const first = makeMockElement();
    const second = makeMockElement();
    const ref = { current: first } as unknown as RefObject<HTMLElement | null>;
    let renders = 0;

    const { rerender } = renderHook(() => {
      renders++;
      useRefEventListener(ref, 'click', vi.fn());
    });

    renders = 0;
    ref.current = second as unknown as HTMLElement;
    rerender();

    expect(second.addEventListener).toHaveBeenCalledTimes(1);
    expect(renders).toBe(1);
  });

  it('binds document and window targets without an extra render', () => {
    let renders = 0;
    const addDoc = vi.spyOn(document, 'addEventListener');
    const removeDoc = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => {
      renders++;
      useRefEventListener(document, 'keyup', vi.fn());
    });

    expect(addDoc).toHaveBeenCalledWith('keyup', expect.any(Function));
    expect(renders).toBe(1);

    unmount();

    expect(removeDoc).toHaveBeenCalledWith('keyup', expect.any(Function));
    addDoc.mockRestore();
    removeDoc.mockRestore();
  });

  it('keeps delivering events to a conditionally rendered target that remounts', () => {
    const callback = vi.fn();

    function Trigger({ showTarget }: { showTarget: boolean }) {
      const ref = useRef<HTMLButtonElement | null>(null);
      useRefEventListener(ref, 'click', callback);

      return showTarget
        ? createElement('button', { ref })
        : createElement('input');
    }

    const { rerender } = render(createElement(Trigger, { showTarget: true }));

    screen.getByRole('button').click();

    expect(callback).toHaveBeenCalledTimes(1);

    // An editable cell swaps its display node out for an input and back again,
    // so the target that returns is a different DOM node than the original.
    rerender(createElement(Trigger, { showTarget: false }));
    rerender(createElement(Trigger, { showTarget: true }));

    screen.getByRole('button').click();

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
