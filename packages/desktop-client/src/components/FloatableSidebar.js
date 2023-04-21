import React, { useState, useContext, useMemo } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { useViewportSize } from '@react-aria/utils';

import * as actions from 'loot-core/src/client/actions';

import { View } from './common';
import { SIDEBAR_WIDTH } from './sidebar';
import SidebarWithData from './SidebarWithData';

const SidebarContext = React.createContext(null);

export function SidebarProvider({ children }) {
  let [hidden, setHidden] = useState(true);
  return (
    <SidebarContext.Provider value={[hidden, setHidden]}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  useViewportSize(); // Force re-render on window resize
  let windowWidth = document.documentElement.clientWidth;
  let alwaysFloats = windowWidth < 668;

  let [hidden, setHidden] = useContext(SidebarContext);
  return useMemo(
    () => ({ hidden, setHidden, alwaysFloats }),
    [hidden, setHidden, alwaysFloats],
  );
}

function Sidebar({ floatingSidebar }) {
  let sidebar = useSidebar();

  let sidebarShouldFloat = floatingSidebar || sidebar.alwaysFloats;

  return (
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

export default withRouter(
  connect(
    state => ({ floatingSidebar: state.prefs.global.floatingSidebar }),
    actions,
  )(Sidebar),
);
