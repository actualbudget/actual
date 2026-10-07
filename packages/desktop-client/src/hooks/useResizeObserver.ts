import { useCallback, useRef } from 'react';

type UseResizeObserverOptions = {
  // Measure synchronously on attach so the first paint uses the real size
  measureOnAttach?: boolean;
};

function getContentRect(el: Element): DOMRectReadOnly {
  const { width, height } = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const left =
    parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);
  const top = parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth);
  const right =
    parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth);
  const bottom =
    parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
  return new DOMRectReadOnly(
    left,
    top,
    width - left - right,
    height - top - bottom,
  );
}

export function useResizeObserver<T extends Element>(
  func: (contentRect: DOMRectReadOnly) => void,
  { measureOnAttach = false }: UseResizeObserverOptions = {},
): (el: T) => void {
  const observer = useRef<ResizeObserver | undefined>(undefined);
  const measure = useRef<((el: T) => void) | undefined>(undefined);
  if (!observer.current) {
    observer.current = new ResizeObserver(entries => {
      func(entries[0].contentRect);
    });
    if (measureOnAttach) {
      measure.current = el => func(getContentRect(el));
    }
  }

  const elementRef = useCallback((el: T) => {
    observer.current?.disconnect();
    if (el) {
      measure.current?.(el);
      observer.current?.observe(el, { box: 'border-box' });
    }
  }, []);

  return elementRef;
}
