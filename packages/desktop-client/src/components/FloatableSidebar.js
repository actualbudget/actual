import React, { useState, useEffect, useContext } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { useViewportSize } from '@react-aria/utils';
import mitt from 'mitt';

import * as actions from 'loot-core/src/client/actions';

import { colors } from '../style';
import { breakpoints } from '../tokens';

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
  return useContext(SidebarContext);
}

function Sidebar({ floatingSidebar }) {
  let [hidden, setHidden] = useState(true);
  let sidebar = useSidebar();

  let windowWidth = useViewportSize().width;
  let sidebarShouldFloat = floatingSidebar || windowWidth < breakpoints.medium;

  if (!sidebarShouldFloat && hidden) {
    setHidden(false);
  }

  useEffect(() => {
    let cleanups = [
      sidebar.on('show', () => setHidden(false)),
      sidebar.on('hide', () => setHidden(true)),
      sidebar.on('toggle', () => setHidden(hidden => !hidden)),
    ];
    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [sidebar]);

  return (
    <>
      {sidebarShouldFloat && (
        <View
          onMouseOver={() => setHidden(false)}
          onMouseLeave={() => setHidden(true)}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: hidden ? 0 : 160,
            zIndex: 999,
          }}
        ></View>
      )}

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
          position: 'absolute',
          top: 50,
          // If not floating, the -50 takes into account the transform below
          bottom: sidebarShouldFloat ? 50 : -50,
          zIndex: 1001,
          borderRadius: '0 6px 6px 0',
          overflow: 'hidden',
          boxShadow:
            !sidebarShouldFloat || hidden
              ? 'none'
              : '0 15px 30px 0 rgba(0,0,0,0.25), 0 3px 15px 0 rgba(0,0,0,.5)',
          transform: `translateY(${!sidebarShouldFloat ? -50 : 0}px)
                      translateX(${hidden ? -SIDEBAR_WIDTH : 0}px)`,
          transition: 'transform .5s, box-shadow .5s',
        }}
      >
        <SidebarWithData />
      </View>

      <View
        style={[
          {
            backgroundColor: colors.n1,
            opacity: sidebarShouldFloat ? 0 : 1,
            transform: `translateX(${sidebarShouldFloat ? -50 : 0}px)`,
            transition: 'transform .4s, opacity .2s',
            width: SIDEBAR_WIDTH,
          },
          sidebarShouldFloat && {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
          },
        ]}
      ></View>
    </>
  );
}

export default withRouter(
  connect(
    state => ({ floatingSidebar: state.prefs.global.floatingSidebar }),
    actions,
  )(Sidebar),
);
