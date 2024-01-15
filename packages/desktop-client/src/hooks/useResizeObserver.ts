// @ts-strict-ignore
import { useRef, useCallback } from 'react';

export function useResizeObserver(
  func: (contentRect: DOMRectReadOnly) => void,
): (el: unknown) => void {
  const observer = useRef(null);
  if (!observer.current) {
    observer.current = new ResizeObserver(entries => {
      func(entries[0].contentRect);
    });
  }

  const elementRef = useCallback(el => {
    observer.current.disconnect();
    if (el) {
      observer.current.observe(el, { box: 'border-box' });
    }
  }, []);

  return elementRef;
}
