// @ts-strict-ignore
import React, {
  type ReactNode,
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';

import debounce from 'debounce';

type IScrollContext = {
  scrollY: number | undefined;
  hasScrolledToBottom: (tolerance?: number) => boolean;
};

const ScrollContext = createContext<IScrollContext | undefined>(undefined);

type ScrollProviderProps = {
  children?: ReactNode;
};

export function ScrollProvider({ children }: ScrollProviderProps) {
  const [scrollY, setScrollY] = useState(undefined);
  const [scrollHeight, setScrollHeight] = useState(undefined);
  const [clientHeight, setClientHeight] = useState(undefined);

  const hasScrolledToBottom = useCallback(
    (tolerance = 1) => scrollHeight - scrollY <= clientHeight + tolerance,
    [clientHeight, scrollHeight, scrollY],
  );

  useEffect(() => {
    const listenToScroll = debounce(e => {
      const target = e.target;
      setScrollY(target?.scrollTop || 0);
      setScrollHeight(target?.scrollHeight || 0);
      setClientHeight(target?.clientHeight || 0);
    }, 10);

    window.addEventListener('scroll', listenToScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener('scroll', listenToScroll, {
        capture: true,
      });
  }, []);

  return (
    <ScrollContext.Provider value={{ scrollY, hasScrolledToBottom }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll(): IScrollContext {
  return useContext(ScrollContext);
}
