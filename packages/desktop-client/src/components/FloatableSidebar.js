import React, { createContext, useState, useContext, useMemo } from 'react';
import { connect, useSelector } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';

import { useResponsive } from '../ResponsiveProvider';

import { View } from './common';
import { SIDEBAR_WIDTH } from './sidebar';
import SidebarWithData from './SidebarWithData';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  let floatingSidebar = useSelector(
    state => state.prefs.global.floatingSidebar,
  );
  let [hidden, setHidden] = useState(true);
  let { width } = useResponsive();
  let alwaysFloats = width < 668;
  let floating = floatingSidebar || alwaysFloats;

  return (
    <SidebarContext.Provider
      value={{ hidden, setHidden, floating, alwaysFloats }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  let { hidden, setHidden, floating, alwaysFloats } =
    useContext(SidebarContext);

  return useMemo(
    () => ({ hidden, setHidden, floating, alwaysFloats }),
    [hidden, setHidden, floating, alwaysFloats],
  );
}

function Sidebar({ floatingSidebar }) {
  let sidebar = useSidebar();
  let { isNarrowWidth } = useResponsive();

  let sidebarShouldFloat = floatingSidebar || sidebar.alwaysFloats;

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

export default connect(
  state => ({ floatingSidebar: state.prefs.global.floatingSidebar }),
  actions,
)(Sidebar);
