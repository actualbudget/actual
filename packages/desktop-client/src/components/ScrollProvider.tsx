import React, {
  type ReactNode,
  createContext,
  useState,
  useContext,
  useEffect,
} from 'react';

type IScrollContext = {
  scrollY: number | undefined;
};

const ScrollContext = createContext<IScrollContext | undefined>(undefined);

type ScrollProviderProps = {
  children?: ReactNode;
};

export default function ScrollProvider({ children }: ScrollProviderProps) {
  const [scrollY, setScrollY] = useState(undefined);

  useEffect(() => {
    const listenToScroll = e => {
      setScrollY(e.target?.scrollTop || 0);
    };
    window.addEventListener('scroll', listenToScroll, { capture: true });
    return () =>
      window.removeEventListener('scroll', listenToScroll, { capture: true });
  }, []);

  return <ScrollContext.Provider value={{ scrollY }} children={children} />;
}

export function useScroll(): IScrollContext {
  return useContext(ScrollContext);
}
