import { useRef, useCallback } from 'react';

export default function useResizeObserver(func) {
  let observer = useRef(null);
  if (!observer.current) {
    observer.current = new ResizeObserver(entries => {
      func(entries[0].contentRect);
    });
  }

  let elementRef = useCallback(el => {
    observer.current.disconnect();
    if (el) {
      observer.current.observe(el, { box: 'border-box' });
    }
  }, []);

  return elementRef;
}
