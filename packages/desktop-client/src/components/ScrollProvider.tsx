// @ts-strict-ignore
import React, {
  type ReactNode,
  createContext,
  useState,
  useContext,
  useEffect,
} from 'react';

import debounce from 'debounce';

type IScrollContext = {
  scrollY: number | undefined;
  isBottomReached: boolean;
};

const ScrollContext = createContext<IScrollContext | undefined>(undefined);

type ScrollProviderProps = {
  children?: ReactNode;
};

export function ScrollProvider({ children }: ScrollProviderProps) {
  const [scrollY, setScrollY] = useState(undefined);
  const [isBottomReached, setIsBottomReached] = useState(false);

  useEffect(() => {
    const listenToScroll = debounce(e => {
      setScrollY(e.target?.scrollTop || 0);
      setIsBottomReached(
        e.target?.scrollHeight - e.target?.scrollTop <= e.target?.clientHeight,
      );
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
    <ScrollContext.Provider value={{ scrollY, isBottomReached }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll(): IScrollContext {
  return useContext(ScrollContext);
}
