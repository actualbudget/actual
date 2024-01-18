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
import { useSelector } from 'react-redux';

import { useResponsive } from '../../ResponsiveProvider';
import { View } from '../common/View';

import { SIDEBAR_WIDTH } from './Sidebar';
import { SidebarWithData } from './SidebarWithData';

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
  const floatingSidebar = useSelector(
    state => state.prefs.global.floatingSidebar,
  );
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

export function FloatableSidebar() {
  const floatingSidebar = useSelector(
    state => state.prefs.global.floatingSidebar,
  );

  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();

  const sidebarShouldFloat = floatingSidebar || sidebar.alwaysFloats;

  return isNarrowWidth ? null : (
    <View
      onMouseOver={
        sidebarShouldFloat
          ? e => {
              e.stopPropagation();
              sidebar.setHidden(false);
            }
          : null
      }
      onMouseLeave={sidebarShouldFloat ? () => sidebar.setHidden(true) : null}
      style={{
        position: sidebarShouldFloat ? 'absolute' : null,
        top: 12,
        // If not floating, the -50 takes into account the transform below
        bottom: sidebarShouldFloat ? 12 : -50,
        zIndex: 1001,
        borderRadius: sidebarShouldFloat ? '0 6px 6px 0' : 0,
        overflow: 'hidden',
        boxShadow:
          !sidebarShouldFloat || sidebar.hidden
            ? 'none'
            : '0 15px 30px 0 rgba(0,0,0,0.25), 0 3px 15px 0 rgba(0,0,0,.5)',
        transform: `translateY(${!sidebarShouldFloat ? -12 : 0}px)
                      translateX(${
                        sidebarShouldFloat && sidebar.hidden
                          ? -SIDEBAR_WIDTH
                          : 0
                      }px)`,
        transition:
          'transform .5s, box-shadow .5s, border-radius .5s, bottom .5s',
      }}
    >
      <SidebarWithData />
    </View>
  );
}
