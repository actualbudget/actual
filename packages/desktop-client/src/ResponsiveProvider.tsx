import React, { ReactNode, useContext } from 'react';

import { useViewportSize } from '@react-aria/utils';

import { breakpoints } from './tokens';

type TResponsiveContext = {
  atLeastSmallWidth: boolean;
  atLeastMediumWidth: boolean;
  isNarrowWidth: boolean;
  isMediumWidth: boolean;
  isWideWidth: boolean;
  height: number;
  clientWidth: number;
};

const ResponsiveContext = React.createContext<TResponsiveContext>(null);

export function ResponsiveProvider(props: { children: ReactNode }) {
  const { height, width } = useViewportSize();

  // Possible view modes: narrow, small, medium, wide
  const viewportInfo = {
    atLeastSmallWidth: width >= breakpoints.small,
    atLeastMediumWidth: width >= breakpoints.medium,
    isNarrowWidth: width < breakpoints.small,
    isSmallWidth: width >= breakpoints.small && width < breakpoints.medium,
    isMediumWidth: width >= breakpoints.medium && width < breakpoints.wide,
    isWideWidth: width >= breakpoints.wide,
    height: height,
    clientWidth: document.documentElement.clientWidth, // raw pixel width
  };

  return (
    <ResponsiveContext.Provider value={viewportInfo}>
      {props.children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  return useContext(ResponsiveContext);
}
