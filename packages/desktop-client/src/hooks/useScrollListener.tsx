import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

import debounce from 'lodash/debounce';

type ScrollDirection = 'up' | 'down' | 'left' | 'right';

type ScrollListenerArgs = {
  scrollX: number;
  scrollY: number;
  isScrolling: (direction: ScrollDirection) => boolean;
  hasScrolledToEnd: (direction: ScrollDirection, tolerance?: number) => boolean;
};

type ScrollListener = (args: ScrollListenerArgs) => void;
type UnregisterScrollListener = () => void;
type RegisterScrollListener = (
  listener: ScrollListener,
) => UnregisterScrollListener;

type IScrollContext = {
  registerScrollListener: RegisterScrollListener;
};

const ScrollContext = createContext<IScrollContext | undefined>(undefined);

type ScrollProviderProps<T extends Element> = {
  scrollableRef: RefObject<T>;
  isDisabled?: boolean;
  delayMs?: number;
  children?: ReactNode;
};

export function ScrollProvider<T extends Element>({
  scrollableRef,
  isDisabled,
  delayMs = 100,
  children,
}: ScrollProviderProps<T>) {
  const previousScrollX = useRef<number | undefined>(undefined);
  const scrollX = useRef<number | undefined>(undefined);
  const previousScrollY = useRef<number | undefined>(undefined);
  const scrollY = useRef<number | undefined>(undefined);
  const scrollWidth = useRef<number | undefined>(undefined);
  const scrollHeight = useRef<number | undefined>(undefined);
  const clientWidth = useRef<number | undefined>(undefined);
  const clientHeight = useRef<number | undefined>(undefined);
  const listeners = useRef<ScrollListener[]>([]);

  const hasScrolledToEnd = useCallback(
    (direction: ScrollDirection, tolerance = 1) => {
      const isAtStart = (currentCoordinate?: number) =>
        currentCoordinate !== undefined && currentCoordinate <= tolerance;

      const isAtEnd = (
        totalSize?: number,
        currentCoordinate?: number,
        viewportSize?: number,
      ) =>
        totalSize !== undefined &&
        currentCoordinate !== undefined &&
        viewportSize !== undefined &&
        totalSize - currentCoordinate <= viewportSize + tolerance;

      switch (direction) {
        case 'up': {
          return isAtStart(scrollY.current);
        }
        case 'down': {
          return isAtEnd(
            scrollHeight.current,
            scrollY.current,
            clientHeight.current,
          );
        }
        case 'left': {
          return isAtStart(scrollX.current);
        }
        case 'right': {
          return isAtEnd(
            scrollWidth.current,
            scrollX.current,
            clientWidth.current,
          );
        }
        default:
          return false;
      }
    },
    [],
  );

  const isScrolling = useCallback((direction: ScrollDirection) => {
    switch (direction) {
      case 'up':
        return (
          previousScrollY.current !== undefined &&
          scrollY.current !== undefined &&
          previousScrollY.current > scrollY.current
        );
      case 'down':
        return (
          previousScrollY.current !== undefined &&
          scrollY.current !== undefined &&
          previousScrollY.current < scrollY.current
        );
      case 'left':
        return (
          previousScrollX.current !== undefined &&
          scrollX.current !== undefined &&
          previousScrollX.current > scrollX.current
        );
      case 'right':
        return (
          previousScrollX.current !== undefined &&
          scrollX.current !== undefined &&
          previousScrollX.current < scrollX.current
        );
      default:
        return false;
    }
  }, []);

  const listenToScroll = useMemo(
    () =>
      debounce((e: Event) => {
        const target = e.target;
        if (target instanceof Element) {
          previousScrollX.current = scrollX.current;
          scrollX.current = target.scrollLeft;
          scrollWidth.current = target.scrollWidth;
          clientWidth.current = target.clientWidth;

          previousScrollY.current = scrollY.current;
          scrollY.current = target.scrollTop;
          scrollHeight.current = target.scrollHeight;
          clientHeight.current = target.clientHeight;

          const currentScrollX = scrollX.current;
          const currentScrollY = scrollY.current;

          if (currentScrollX !== undefined && currentScrollY !== undefined) {
            listeners.current.forEach(listener =>
              listener({
                scrollX: currentScrollX,
                scrollY: currentScrollY,
                isScrolling,
                hasScrolledToEnd,
              }),
            );
          }
        }
      }, delayMs),
    [delayMs, hasScrolledToEnd, isScrolling],
  );

  useEffect(() => {
    const toCancel = listenToScroll;
    return () => toCancel.cancel();
  }, [listenToScroll]);

  useEffect(() => {
    if (isDisabled) {
      return;
    }

    const ref = scrollableRef.current;

    ref?.addEventListener('scroll', listenToScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      ref?.removeEventListener('scroll', listenToScroll, {
        capture: true,
      });
  }, [isDisabled, listenToScroll, scrollableRef]);

  const registerScrollListener: RegisterScrollListener = useCallback(
    listener => {
      listeners.current.push(listener);

      return () => {
        listeners.current = listeners.current.filter(l => l !== listener);
      };
    },
    [],
  );

  return (
    <ScrollContext.Provider value={{ registerScrollListener }}>
      {children}
    </ScrollContext.Provider>
  );
}

/**
 * A hook to register a listener when the user scrolls within a ScrollProvider.
 *
 * @param listener The scroll listener to register. It is important to wrap this function
 * in useCallback to avoid unnecessary unregistering and reregistering on each render.
 */
export function useScrollListener(listener: ScrollListener) {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScrollListener must be used within a ScrollProvider');
  }

  const { registerScrollListener } = context;

  useEffect(() => {
    return registerScrollListener(listener);
  }, [listener, registerScrollListener]);
}
