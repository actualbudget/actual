import React from 'react';

import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useResponsive } from '../../ResponsiveProvider';
import { View } from '../common/View';

import { SIDEBAR_WIDTH, Sidebar } from './Sidebar';
import { useSidebar } from './SidebarProvider';

export function FloatableSidebar() {
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

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
          : undefined
      }
      onMouseLeave={
        sidebarShouldFloat ? () => sidebar.setHidden(true) : undefined
      }
      style={{
        position: sidebarShouldFloat ? 'absolute' : undefined,
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
      <Sidebar />
    </View>
  );
}
