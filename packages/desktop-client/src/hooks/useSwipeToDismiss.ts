import { useEffect, useRef } from 'react';

const DRAG_START_PX = 8;
const DISMISS_DISTANCE_PX = 80;
const DISMISS_RELEASE_VELOCITY_PX_PER_MS = 0.5;

type UseSwipeToDismissOptions = {
  isEnabled: boolean;
  onDismiss: () => void;
};

function isScrolledDown(target: EventTarget | null, root: HTMLElement) {
  let element = target instanceof HTMLElement ? target : null;
  while (element && element !== root) {
    if (element.scrollTop > 0 && element.scrollHeight > element.clientHeight) {
      return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function useSwipeToDismiss({
  isEnabled,
  onDismiss,
}: UseSwipeToDismissOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const element = ref.current;
    if (!isEnabled || !element) {
      return;
    }

    let startY = 0;
    let offset = 0;
    let lastY = 0;
    let lastTime = 0;
    let previousY = 0;
    let previousTime = 0;
    let isDragging = false;
    let isBlocked = false;

    const snapBack = () => {
      isDragging = false;
      isBlocked = true;
      offset = 0;
      element.style.transition = 'transform 200ms ease-out';
      element.style.transform = '';
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        if (isDragging) {
          snapBack();
        }
        isBlocked = true;
        return;
      }
      isBlocked = isScrolledDown(event.target, element);
      isDragging = false;
      offset = 0;
      startY = event.touches[0].clientY;
      lastY = startY;
      previousY = startY;
      lastTime = event.timeStamp;
      previousTime = event.timeStamp;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (isBlocked || event.touches.length !== 1) {
        return;
      }
      const y = event.touches[0].clientY;
      const dy = y - startY;
      if (!isDragging) {
        if (dy < -DRAG_START_PX) {
          isBlocked = true;
          return;
        }
        if (dy < DRAG_START_PX) {
          return;
        }
        isDragging = true;
        element.style.transition = 'none';
      }
      event.preventDefault();
      previousY = lastY;
      previousTime = lastTime;
      lastY = y;
      lastTime = event.timeStamp;
      offset = Math.max(0, dy);
      element.style.transform = `translateY(${offset}px)`;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isDragging) {
        return;
      }
      if (event.touches.length > 0) {
        snapBack();
        return;
      }
      isDragging = false;
      const releaseVelocity =
        (lastY - previousY) / Math.max(1, lastTime - previousTime);
      if (
        offset > DISMISS_DISTANCE_PX ||
        releaseVelocity > DISMISS_RELEASE_VELOCITY_PX_PER_MS
      ) {
        onDismissRef.current();
        return;
      }
      snapBack();
    };

    const onInterrupted = () => {
      if (isDragging) {
        snapBack();
      }
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onInterrupted);
    window.addEventListener('blur', onInterrupted);
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onInterrupted);
      window.removeEventListener('blur', onInterrupted);
    };
  }, [isEnabled]);

  return ref;
}
