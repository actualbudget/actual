import { type ReactNode, createContext, useContext } from 'react';

import { useWindowSize } from 'usehooks-ts';

import { breakpoints } from '../../tokens';

type TResponsiveContext = {
  atLeastMediumWidth: boolean;
  isNarrowWidth: boolean;
  isSmallWidth: boolean;
  isMediumWidth: boolean;
  isWideWidth: boolean;
  height: number;
  width: number;
};

const ResponsiveContext = createContext<TResponsiveContext | undefined>(
  undefined,
);

export function ResponsiveProvider(props: { children: ReactNode }) {
  const { height, width } = useWindowSize({
    debounceDelay: 250,
  });

  // Possible view modes: narrow, small, medium, wide
  // To check if we're at least small width, check !isNarrowWidth
  const viewportInfo = {
    // atLeastMediumWidth is provided to avoid checking (isMediumWidth || isWideWidth)
    atLeastMediumWidth: width >= breakpoints.medium,
    isNarrowWidth: width < breakpoints.small,
    isSmallWidth: width >= breakpoints.small && width < breakpoints.medium,
    isMediumWidth: width >= breakpoints.medium && width < breakpoints.wide,
    // No atLeastWideWidth because that's identical to isWideWidth
    isWideWidth: width >= breakpoints.wide,
    height,
    width,
  };

  return (
    <ResponsiveContext.Provider value={viewportInfo}>
      {props.children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
}
