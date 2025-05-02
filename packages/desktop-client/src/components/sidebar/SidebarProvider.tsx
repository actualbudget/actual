// @ts-strict-ignore
import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

type SidebarContextValue = {
  hidden: boolean;
  setHidden: Dispatch<SetStateAction<boolean>>;
  floating: boolean;
  alwaysFloats: boolean;
};

const SidebarContext = createContext<SidebarContextValue>(null);

type SidebarProviderProps = {
  children: ReactNode;
};

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [floatingSidebar] = useGlobalPref('floatingSidebar');
  const [hidden, setHidden] = useState(true);
  const { width } = useResponsive();
  const alwaysFloats = width < 668;
  const floating = floatingSidebar || alwaysFloats;

  return (
    <SidebarContext.Provider
      value={{ hidden, setHidden, floating, alwaysFloats }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const { hidden, setHidden, floating, alwaysFloats } =
    useContext(SidebarContext);

  return useMemo(
    () => ({ hidden, setHidden, floating, alwaysFloats }),
    [hidden, setHidden, floating, alwaysFloats],
  );
}
