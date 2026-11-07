import { useEffect, useState } from 'react';

/**
 * Check if the given element is visible in the viewport.
 *
 * The element is passed directly (tracked as state through a callback ref)
 * rather than as a ref object, so the observer follows the element when it is
 * replaced, e.g. when a dashboard card is remounted on toggling edit mode.
 */
export function useIsInViewport(element: Element | null) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) =>
      setIsIntersecting(entry.isIntersecting),
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element]);

  return isIntersecting;
}
