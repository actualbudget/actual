import React, { useState, useEffect, useContext } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { useViewportSize } from '@react-aria/utils';
import mitt from 'mitt';

import * as actions from 'loot-core/src/client/actions';

import { View } from './common';
import { SIDEBAR_WIDTH } from './sidebar';
import SidebarWithData from './SidebarWithData';

const SidebarContext = React.createContext(null);

export function SidebarProvider({ children }) {
  let emitter = mitt();
  return (
    <SidebarContext.Provider
      value={{
        show: () => emitter.emit('show'),
        hide: () => emitter.emit('hide'),
        toggle: () => emitter.emit('toggle'),
        on: (name, listener) => {
          emitter.on(name, listener);
          return () => emitter.off(name, listener);
        },
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  useViewportSize(); // Force re-render on window resize
  let windowWidth = document.documentElement.clientWidth;
  let alwaysFloats = windowWidth < 668;

  let context = useContext(SidebarContext);
  return { ...context, alwaysFloats };
}

function Sidebar({ floatingSidebar }) {
  let [hidden, setHidden] = useState(true);
  let sidebar = useSidebar();

  let sidebarShouldFloat = floatingSidebar || sidebar.alwaysFloats;

  useEffect(() => {
    let cleanups = [
      sidebar.on('show', () => setHidden(false)),
      sidebar.on('hide', () => setHidden(true)),
      // using hidden => !hidden causes a bug bc the handler is called twice?!?!
      sidebar.on('toggle', () => setHidden(!hidden)),
    ];
    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [sidebar, hidden]);

  return (
    <View
      onMouseOver={
        sidebarShouldFloat
          ? e => {
              e.stopPropagation();
              setHidden(false);
            }
          : null
      }
      onMouseLeave={sidebarShouldFloat ? () => setHidden(true) : null}
      style={{
        position: sidebarShouldFloat ? 'absolute' : null,
        top: 12,
        // If not floating, the -50 takes into account the transform below
        bottom: sidebarShouldFloat ? 12 : -50,
        zIndex: 1001,
        borderRadius: sidebarShouldFloat ? '0 6px 6px 0' : 0,
        overflow: 'hidden',
        boxShadow:
          !sidebarShouldFloat || hidden
            ? 'none'
            : '0 15px 30px 0 rgba(0,0,0,0.25), 0 3px 15px 0 rgba(0,0,0,.5)',
        transform: `translateY(${!sidebarShouldFloat ? -12 : 0}px)
                      translateX(${
                        sidebarShouldFloat && hidden ? -SIDEBAR_WIDTH : 0
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
