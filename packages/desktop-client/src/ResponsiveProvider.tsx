import React, { ReactNode, useContext } from 'react';

import { useViewportSize } from '@react-aria/utils';

import { breakpoints } from './tokens';

/* eslint-disable no-unused-vars */
enum VIEW_MODES {
  NARROW = 'narrow',
  MEDIUM = 'medium',
  WIDE = 'wide',
}
/* eslint-enable no-unused-vars */

function getWidthName(width: number): VIEW_MODES {
  return width < breakpoints.medium
    ? VIEW_MODES.NARROW
    : width >= breakpoints.medium && width < breakpoints.wide
    ? VIEW_MODES.MEDIUM
    : VIEW_MODES.WIDE;
}

type TResponsiveContext = {
  atLeastMediumWidth: boolean;
  isNarrowWidth: boolean;
  isMediumWidth: boolean;
  isWideWidth: boolean;
  height: number;
  width: number;
  viewMode: VIEW_MODES;
};

const ResponsiveContext = React.createContext<TResponsiveContext>(null);

export function ResponsiveProvider(props: { children: ReactNode }) {
  const { height, width } = useViewportSize();

  const viewportInfo = {
    atLeastMediumWidth: width >= breakpoints.medium,
    isNarrowWidth: width < breakpoints.medium,
    isMediumWidth: width >= breakpoints.medium && width < breakpoints.wide,
    isWideWidth: width >= breakpoints.wide,
    height: height,
    width: width,
    viewMode: getWidthName(width),
  };

  return (
    <ResponsiveContext.Provider value={viewportInfo}>
      {props.children}
    </ResponsiveContext.Provider>
  );
}

export function useViewport() {
  return useContext(ResponsiveContext);
}
