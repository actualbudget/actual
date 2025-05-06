import React from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { View } from '@actual-app/components/view';
import { useDebounceCallback } from 'usehooks-ts';

import { Sidebar } from './Sidebar';
import { useSidebar } from './SidebarProvider';

import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

export function FloatableSidebar() {
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();

  const sidebarShouldFloat = floatingSidebar || sidebar.alwaysFloats;
  const debouncedHideSidebar = useDebounceCallback(
    () => sidebar.setHidden(true),
    350,
  );

  return isNarrowWidth ? null : (
    <View
      onMouseOver={
        sidebarShouldFloat
          ? e => {
              debouncedHideSidebar.cancel();
              e.stopPropagation();
              sidebar.setHidden(false);
            }
          : undefined
      }
      onMouseLeave={
        sidebarShouldFloat ? () => debouncedHideSidebar() : undefined
      }
      style={{
        position: sidebarShouldFloat ? 'absolute' : undefined,
        top: 8,
        // If not floating, the -50 takes into account the transform below
        bottom: sidebarShouldFloat ? 8 : -50,
        zIndex: 1001,
        borderRadius: sidebarShouldFloat ? '0 6px 6px 0' : 0,
        overflow: 'hidden',
        boxShadow:
          !sidebarShouldFloat || sidebar.hidden
            ? 'none'
            : '0 15px 30px 0 rgba(0,0,0,0.25), 0 3px 15px 0 rgba(0,0,0,.5)',
        transform: `translateY(${!sidebarShouldFloat ? -8 : 0}px)
                      translateX(${
                        sidebarShouldFloat && sidebar.hidden ? '-100' : '0'
                      }%)`,
        transition:
          'transform .5s, box-shadow .5s, border-radius .5s, bottom .5s',
      }}
    >
      <Sidebar />
    </View>
  );
}
