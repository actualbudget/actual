import React, {
  type ReactNode,
  type RefObject,
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

type ScrollProviderProps<T extends Element> = {
  scrollableRef: RefObject<T>;
  isDisabled: boolean;
  children?: ReactNode;
};

export function ScrollProvider<T extends Element>({
  scrollableRef,
  isDisabled,
  children,
}: ScrollProviderProps<T>) {
  const [scrollY, setScrollY] = useState<number | undefined>(undefined);
  const [scrollHeight, setScrollHeight] = useState<number | undefined>(
    undefined,
  );
  const [clientHeight, setClientHeight] = useState<number | undefined>(
    undefined,
  );

  const hasScrolledToBottom = useCallback(
    (tolerance = 1) => {
      if (scrollHeight && scrollY && clientHeight) {
        return scrollHeight - scrollY <= clientHeight + tolerance;
      }
      return false;
    },
    [clientHeight, scrollHeight, scrollY],
  );

  useEffect(() => {
    if (isDisabled) {
      return;
    }

    const listenToScroll = debounce((e: Event) => {
      const target = e.target;
      if (target instanceof Element) {
        setScrollY(target.scrollTop || 0);
        setScrollHeight(target.scrollHeight || 0);
        setClientHeight(target.clientHeight || 0);
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
  }, [isDisabled, scrollableRef]);

  return (
    <ScrollContext.Provider value={{ scrollY, hasScrolledToBottom }}>
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
