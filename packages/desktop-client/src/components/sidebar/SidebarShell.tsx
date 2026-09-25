import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as Platform from '@actual-app/core/shared/platform';
import { css, cx } from '@emotion/css';
import { Resizable } from 're-resizable';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';
import { useResizeObserver } from '#hooks/useResizeObserver';

const MIN_SIDEBAR_WIDTH = 200;

export function hasMacOSWindowButtons() {
  return !Platform.isBrowser && Platform.OS === 'mac';
}

type SidebarShellProps = {
  defaultWidth?: number;
  className?: string;
  children: ReactNode;
};

export function SidebarShell({
  defaultWidth = 240,
  className,
  children,
}: SidebarShellProps) {
  const hasWindowButtons = hasMacOSWindowButtons();
  const { width } = useResponsive();
  const [isFloating = false] = useGlobalPref('floatingSidebar');

  const [sidebarWidthLocalPref, setSidebarWidthLocalPref] =
    useLocalPref('sidebarWidth');
  const maxSidebarWidth = width / 3;

  const [sidebarWidth, setSidebarWidth] = useState(
    Math.min(
      maxSidebarWidth,
      Math.max(MIN_SIDEBAR_WIDTH, sidebarWidthLocalPref || defaultWidth),
    ),
  );

  const onResizeStop = () => {
    setSidebarWidthLocalPref(sidebarWidth);
  };

  const containerRef = useResizeObserver<HTMLDivElement>(rect => {
    setSidebarWidth(rect.width);
  });

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Resizable
        defaultSize={{
          width: sidebarWidth,
          height: '100%',
        }}
        onResizeStop={onResizeStop}
        maxWidth={maxSidebarWidth}
        minWidth={MIN_SIDEBAR_WIDTH}
        enable={{
          top: false,
          right: true,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      >
        <View
          innerRef={containerRef}
          className={cx(
            className,
            css({
              color: theme.sidebarItemText,
              height: '100%',
              backgroundColor: theme.sidebarBackground,
              '& .float': {
                opacity: isFloating ? 1 : 0,
                transition: 'opacity .25s, width .25s',
                width: hasWindowButtons || isFloating ? null : 0,
              } as CSSProperties,
              '&:hover .float': {
                opacity: 1,
                width: hasWindowButtons ? null : 'auto',
              } as CSSProperties,
              flex: 1,
              ...styles.darkScrollbar,
            }),
          )}
        >
          {children}
        </View>
      </Resizable>
    </ErrorBoundary>
  );
}
