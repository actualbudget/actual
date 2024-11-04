import React, {
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import debounce from 'debounce';

type ScrollDirection = 'up' | 'down' | 'left' | 'right';

type ScrollListenerArgs = {
  scrollX: number;
  scrollY: number;
  isScrolling: (direction: ScrollDirection) => boolean;
  hasScrolledToEnd: (direction: ScrollDirection, tolerance?: number) => boolean;
};

type ScrollListener = (args: ScrollListenerArgs) => void;
type UnregisterScrollListener = () => void;
type RegisterScrollListener = (listener: ScrollListener) => UnregisterScrollListener;

type IScrollContext = {
  registerScrollListener: RegisterScrollListener;
};

const ScrollContext = createContext<IScrollContext | undefined>(undefined);

type ScrollProviderProps<T extends Element> = {
  scrollableRef: RefObject<T>;
  isDisabled?: boolean;
  children?: ReactNode;
};

export function ScrollProvider<T extends Element>({
  scrollableRef,
  isDisabled,
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
      switch (direction) {
        case 'up':
          const hasScrolledToTop = () => {
            if (scrollY.current !== undefined) {
              return scrollY.current <= tolerance;
            }
            return false;
          };
          return hasScrolledToTop();
        case 'down':
          const hasScrolledToBottom = () => {
            if (
              scrollHeight.current !== undefined &&
              scrollY.current !== undefined &&
              clientHeight.current !== undefined
            ) {
              return (
                scrollHeight.current - scrollY.current <=
                clientHeight.current + tolerance
              );
            }
            return false;
          };
          return hasScrolledToBottom();
        case 'left':
          const hasScrollToLeft = () => {
            if (scrollX.current !== undefined) {
              return scrollX.current <= tolerance;
            }
            return false;
          };
          return hasScrollToLeft();
        case 'right':
          const hasScrolledToRight = () => {
            if (
              scrollWidth.current !== undefined &&
              scrollX.current !== undefined &&
              clientWidth.current !== undefined
            ) {
              return (
                scrollWidth.current - scrollX.current <=
                clientWidth.current + tolerance
              );
            }

            return false;
          };
          return hasScrolledToRight();
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

  useEffect(() => {
    if (isDisabled) {
      return;
    }

    const listenToScroll = debounce((e: Event) => {
      const target = e.target;
      if (target instanceof Element) {
        previousScrollX.current = scrollX.current;
        scrollX.current = target.scrollLeft;
        previousScrollY.current = scrollY.current;
        scrollY.current = target.scrollTop;
        scrollHeight.current = target.scrollHeight;
        clientHeight.current = target.clientHeight;

        listeners.current.forEach(listener =>
          listener({
            scrollX: scrollX.current!,
            scrollY: scrollY.current!,
            isScrolling,
            hasScrolledToEnd,
          }),
        );
      }
    }, 10);

    const ref = scrollableRef.current;

    ref?.addEventListener('scroll', listenToScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      ref?.removeEventListener('scroll', listenToScroll, {
        capture: true,
      });
  }, [hasScrolledToEnd, isDisabled, isScrolling, scrollableRef]);

  const registerScrollListener: RegisterScrollListener = useCallback(listener => {
    listeners.current.push(listener);

    return () => {
      listeners.current = listeners.current.filter(l => l !== listener);
    };
  }, []);

  return (
    <ScrollContext.Provider value={{ registerScrollListener }}>
      {children}
    </ScrollContext.Provider>
  );
}

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
