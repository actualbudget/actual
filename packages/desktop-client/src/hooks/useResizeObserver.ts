import { useCallback, useRef } from 'react';

export function useResizeObserver<T extends Element>(
  func: (contentRect: DOMRectReadOnly) => void,
): (el: T) => void {
  const observer = useRef<ResizeObserver | undefined>(undefined);
  if (!observer.current) {
    observer.current = new ResizeObserver(entries => {
      func(entries[0].contentRect);
    });
  }

  const elementRef = useCallback((el: T) => {
    observer.current?.disconnect();
    if (el) {
      observer.current?.observe(el, { box: 'border-box' });
    }
  }, []);

  return elementRef;
}
