import React, {
  type ReactNode,
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { debounce } from 'debounce';

type IScrollContext = {
  scrollY: number | undefined;
  scrollX: number | undefined;
  hasScrolledToBottom: (tolerance?: number) => boolean;
  scrollToX: (position: number, smooth: boolean) => void;
  scrollWidth: number | undefined;
  setScrollContainers: (element: HTMLElement[] | null) => void;
  clientWidth: number | undefined;
};

const ScrollContext = createContext<IScrollContext | undefined>(undefined);

type ScrollProviderProps = {
  children?: ReactNode;
};

export function ScrollProvider({ children }: ScrollProviderProps) {
  const [scrollY, setScrollY] = useState<number | undefined>(undefined);
  const [scrollX, setScrollX] = useState<number | undefined>(undefined);
  const [scrollHeight, setScrollHeight] = useState<number | undefined>(
    undefined,
  );
  const [clientHeight, setClientHeight] = useState<number | undefined>(
    undefined,
  );
  const [scrollWidth, setScrollWidth] = useState<number | undefined>(undefined);
  const [clientWidth, setClientWidth] = useState<number | undefined>(undefined);

  // Ref to store the scroll container
  const scrollContainerRef = useRef<HTMLElement[] | null>(null);

  // Function to set the scroll container
  const setScrollContainers = useCallback((element: HTMLElement[] | null) => {
    scrollContainerRef.current = element;
  }, []);

  const hasScrolledToBottom = useCallback(
    (tolerance = 1) =>
      scrollHeight !== undefined &&
      scrollY !== undefined &&
      scrollHeight - scrollY <= (clientHeight ?? 0) + tolerance,
    [clientHeight, scrollHeight, scrollY],
  );

  const scrollToX = useCallback((position: number, smooth: boolean) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.forEach(r => {
        r.scrollTo({
          left: position,
          behavior: smooth ? 'smooth' : 'instant',
        });
      });
    }
  }, []);

  useEffect(() => {
    const listenToScroll = debounce(() => {
      if (scrollContainerRef.current) {
        const target = scrollContainerRef.current[0];
        setScrollY(target.scrollTop || 0);
        setScrollX(target.scrollLeft || 0);
        setScrollHeight(target.scrollHeight || 0);
        setClientHeight(target.clientHeight || 0);
        setScrollWidth(target.scrollWidth || 0);
        setClientWidth(target.clientWidth || 0);
      }
    }, 10);

    if (scrollContainerRef.current && scrollContainerRef.current.length > 0) {
      scrollContainerRef.current[0].addEventListener('scroll', listenToScroll, {
        capture: true,
        passive: true,
      });
    }
    listenToScroll();

    return () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current[0].removeEventListener(
          'scroll',
          listenToScroll,
        );
      }
    };
  }, [scrollContainerRef]);

  return (
    <ScrollContext.Provider
      value={{
        scrollY,
        scrollX,
        hasScrolledToBottom,
        scrollToX,
        scrollWidth,
        setScrollContainers,
        clientWidth,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll(): IScrollContext {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
}
