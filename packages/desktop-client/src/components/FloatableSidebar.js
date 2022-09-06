import React, { useState, useEffect, useContext } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import mitt from 'mitt';

import * as actions from 'loot-core/src/client/actions';
import { View } from 'loot-design/src/components/common';
import { SIDEBAR_WIDTH } from 'loot-design/src/components/sidebar';
import { colors } from 'loot-design/src/style';

import SidebarWithData from './SidebarWithData';

const SidebarContext = React.createContext(null);

export function SidebarProvider({ children }) {
  let emitter = mitt();
  return (
    <SidebarContext.Provider
      value={{
        show: () => emitter.emit('show'),
        hide: () => emitter.emit('hide'),
        on: (name, listener) => {
          emitter.on(name, listener);
          return () => emitter.off(name, listener);
        }
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

  if (!floatingSidebar && hidden) {
    setHidden(false);
  }

  useEffect(() => {
    let cleanups = [
      sidebar.on('show', () => setHidden(false)),
      sidebar.on('hide', () => setHidden(true))
    ];
    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [sidebar]);

  return (
    <>
      {floatingSidebar && (
        <View
          onMouseOver={() => setHidden(false)}
          onMouseLeave={() => setHidden(true)}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: hidden ? 0 : 160,
            zIndex: 999
          }}
        ></View>
      )}

      <View
        onMouseOver={
          floatingSidebar
            ? e => {
                e.stopPropagation();
                setHidden(false);
              }
            : null
        }
        onMouseLeave={floatingSidebar ? () => setHidden(true) : null}
        style={{
          position: 'absolute',
          top: 50,
          // If not floating, the -50 takes into account the transform below
          bottom: floatingSidebar ? 50 : -50,
          zIndex: 1001,
          borderRadius: '0 6px 6px 0',
          overflow: 'hidden',
          boxShadow:
            !floatingSidebar || hidden
              ? 'none'
              : '0 15px 30px 0 rgba(0,0,0,0.25), 0 3px 15px 0 rgba(0,0,0,.5)',
          transform: `translateY(${!floatingSidebar ? -50 : 0}px)
                      translateX(${hidden ? -SIDEBAR_WIDTH : 0}px)`,
          transition: 'transform .5s, box-shadow .5s'
        }}
      >
        <SidebarWithData />
      </View>

      <View
        style={[
          {
            backgroundColor: colors.n1,
            opacity: floatingSidebar ? 0 : 1,
            transform: `translateX(${floatingSidebar ? -50 : 0}px)`,
            transition: 'transform .4s, opacity .2s',
            width: SIDEBAR_WIDTH
          },
          floatingSidebar && {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0
          }
        ]}
      ></View>
    </>
  );
}

export default withRouter(
  connect(
    state => ({ floatingSidebar: state.prefs.global.floatingSidebar }),
    actions
  )(Sidebar)
);
