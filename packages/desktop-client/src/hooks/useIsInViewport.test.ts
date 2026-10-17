import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsInViewport } from './useIsInViewport';

type IntersectionCallback = (
  entries: Array<Pick<IntersectionObserverEntry, 'isIntersecting'>>,
) => void;

let observers: IntersectionObserverStub[] = [];

// jsdom doesn't implement IntersectionObserver. This stub records what is
// observed and lets a test report an intersection for the observed element.
class IntersectionObserverStub {
  callback: IntersectionCallback;
  observed: Element[] = [];
  isDisconnected = false;

  constructor(callback: IntersectionCallback) {
    this.callback = callback;
    observers.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve() {
    // no-op
  }

  disconnect() {
    this.isDisconnected = true;
  }

  intersect(isIntersecting: boolean) {
    this.callback([{ isIntersecting }]);
  }
}

describe('useIsInViewport', () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false while there is no element to observe', () => {
    const { result } = renderHook(() => useIsInViewport(null));

    expect(result.current).toBe(false);
    expect(observers).toHaveLength(0);
  });

  it('reports whether the observed element intersects the viewport', () => {
    const element = document.createElement('div');
    const { result } = renderHook(() => useIsInViewport(element));

    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([element]);
    expect(result.current).toBe(false);

    act(() => observers[0].intersect(true));
    expect(result.current).toBe(true);

    act(() => observers[0].intersect(false));
    expect(result.current).toBe(false);
  });

  it('observes the new element when the element changes', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    const { result, rerender } = renderHook(
      ({ element }: { element: Element | null }) => useIsInViewport(element),
      { initialProps: { element: first } },
    );

    rerender({ element: second });

    expect(observers).toHaveLength(2);
    expect(observers[0].isDisconnected).toBe(true);
    expect(observers[1].observed).toEqual([second]);

    act(() => observers[1].intersect(true));
    expect(result.current).toBe(true);
  });

  it('disconnects the observer on unmount', () => {
    const element = document.createElement('div');
    const { unmount } = renderHook(() => useIsInViewport(element));

    unmount();

    expect(observers[0].isDisconnected).toBe(true);
  });
});
