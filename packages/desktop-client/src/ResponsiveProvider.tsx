import { type ReactNode, createContext, useContext } from 'react';

import { useViewportSize } from '@react-aria/utils';

import { breakpoints } from './tokens';

type TResponsiveContext = {
  atLeastMediumWidth: boolean;
  isNarrowWidth: boolean;
  isSmallWidth: boolean;
  isMediumWidth: boolean;
  isWideWidth: boolean;
  height: number;
  width: number;
};

const ResponsiveContext = createContext<TResponsiveContext>(null);

export function ResponsiveProvider(props: { children: ReactNode }) {
  /*
   * Ensure we render on every viewport size change,
   * even though we're interested in document.documentElement.client<Width|Height>
   * clientWidth/Height are the document size, do not change on pinch-zoom,
   * and are what our `min-width` media queries are reading
   * Viewport size changes on pinch-zoom, which may be useful later when dealing with on-screen keyboards
   */
  useViewportSize();

  const height = document.documentElement.clientHeight;
  const width = document.documentElement.clientWidth;

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
  return useContext(ResponsiveContext);
}
