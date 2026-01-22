import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

const PULL_DOWN_THRESHOLD = 80;
const RESISTANCE = 2;
const MAX_PULL_DISTANCE = 120;

type UsePullToRefreshOnScrollContainerOptions = {
  scrollContainerRef: RefObject<HTMLElement | null>;
  onRefresh: () => Promise<void>;
  isPullable: boolean;
};

type UsePullToRefreshOnScrollContainerResult = {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
};

function isTreeScrollableUp(element: Element): boolean {
  const style = getComputedStyle(element);
  const overflowY = style.overflowY;
  if (element === document.scrollingElement && overflowY === 'visible') {
    return true;
  }
  if (overflowY !== 'scroll' && overflowY !== 'auto') {
    if (element.parentElement) {
      return isTreeScrollableUp(element.parentElement);
    }
    return false;
  }
  if (element instanceof HTMLElement && element.scrollTop > 0) {
    return true;
  }
  if (element.parentElement) {
    return isTreeScrollableUp(element.parentElement);
  }
  return false;
}

export function usePullToRefreshOnScrollContainer({
  scrollContainerRef,
  onRefresh,
  isPullable,
}: UsePullToRefreshOnScrollContainerOptions): UsePullToRefreshOnScrollContainerResult {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const thresholdBreached = useRef(false);
  const isRefreshingRef = useRef(false);
  isRefreshingRef.current = isRefreshing;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const reset = useCallback(() => {
    isDragging.current = false;
    thresholdBreached.current = false;
    startY.current = 0;
    currentY.current = 0;
    setIsPulling(false);
    setPullDistance(0);
  }, []);

  useEffect(() => {
    if (!isPullable || !scrollContainerRef.current) {
      return;
    }

    const el = scrollContainerRef.current;

    const getPageY = (e: TouchEvent | MouseEvent): number => {
      if (e instanceof TouchEvent && e.touches.length > 0) {
        return e.touches[0].pageY;
      }
      if (e instanceof MouseEvent) {
        return e.pageY;
      }
      return 0;
    };

    const onStart = (e: TouchEvent | MouseEvent) => {
      if (!isPullable || isRefreshingRef.current) return;
      if (el.scrollTop > 0) return;

      if (e instanceof TouchEvent) {
        const target = e.target;
        if (target instanceof Element && isTreeScrollableUp(target)) return;
      }

      const rect = el.getBoundingClientRect();
      if (rect.top < 0) return;

      startY.current = getPageY(e);
      currentY.current = startY.current;
      isDragging.current = true;
      thresholdBreached.current = false;
    };

    const onMove = (e: TouchEvent | MouseEvent) => {
      if (!isDragging.current) return;

      currentY.current = getPageY(e);
      const delta = currentY.current - startY.current;

      if (delta <= 0) {
        isDragging.current = false;
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      const distance = Math.min(delta / RESISTANCE, MAX_PULL_DISTANCE);
      setPullDistance(distance);
      setIsPulling(true);

      if (distance >= PULL_DOWN_THRESHOLD) {
        thresholdBreached.current = true;
      }
    };

    const onEnd = () => {
      if (!isDragging.current) return;

      if (thresholdBreached.current) {
        setIsPulling(false);
        setIsRefreshing(true);
        const refresh = onRefreshRef.current;
        refresh()
          .then(() => {
            reset();
          })
          .catch(() => {
            reset();
          })
          .finally(() => {
            setIsRefreshing(false);
          });
      } else {
        reset();
      }
    };

    const opts = { passive: false as const };
    const passiveOpts = { passive: true };

    el.addEventListener('touchstart', onStart, passiveOpts);
    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchmove', onMove, opts);
    el.addEventListener('touchend', onEnd);
    el.addEventListener('mouseup', onEnd);
    document.body.addEventListener('mouseleave', onEnd);

    const onMoveGlobal = (e: MouseEvent) => {
      if (isDragging.current) onMove(e);
    };
    const onEndGlobal = () => {
      if (isDragging.current) onEnd();
    };
    window.addEventListener('mousemove', onMoveGlobal, opts);
    window.addEventListener('mouseup', onEndGlobal);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('mousedown', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('mouseup', onEnd);
      document.body.removeEventListener('mouseleave', onEnd);
      window.removeEventListener('mousemove', onMoveGlobal);
      window.removeEventListener('mouseup', onEndGlobal);
    };
  }, [isPullable, reset, scrollContainerRef]);

  return { isPulling, isRefreshing, pullDistance };
}
