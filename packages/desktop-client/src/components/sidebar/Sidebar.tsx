import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as Platform from '@actual-app/core/shared/platform';
import { css } from '@emotion/css';
import { Resizable } from 're-resizable';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';
import { useResizeObserver } from '#hooks/useResizeObserver';

import { Accounts } from './Accounts';
import { BudgetName } from './BudgetName';
import { PrimaryButtons } from './PrimaryButtons';
import { useSidebar } from './SidebarProvider';
import { ToggleButton } from './ToggleButton';

export function Sidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const sidebar = useSidebar();
  const { width } = useResponsive();
  const [isFloating = false, setFloatingSidebarPref] =
    useGlobalPref('floatingSidebar');

  const [sidebarWidthLocalPref, setSidebarWidthLocalPref] =
    useLocalPref('sidebarWidth');
  const DEFAULT_SIDEBAR_WIDTH = 240;
  const MAX_SIDEBAR_WIDTH = width / 3;
  const MIN_SIDEBAR_WIDTH = 200;

  const [sidebarWidth, setSidebarWidth] = useState(
    Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(
        MIN_SIDEBAR_WIDTH,
        sidebarWidthLocalPref || DEFAULT_SIDEBAR_WIDTH,
      ),
    ),
  );

  const onResizeStop = () => {
    setSidebarWidthLocalPref(sidebarWidth);
  };

  const onFloat = () => {
    setFloatingSidebarPref(!isFloating);
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
        maxWidth={MAX_SIDEBAR_WIDTH}
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
          className={css({
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
          })}
        >
          <BudgetName>
            {!sidebar.alwaysFloats && (
              <ToggleButton isFloating={isFloating} onFloat={onFloat} />
            )}
          </BudgetName>

          <View
            style={{
              flexGrow: 1,
              '@media screen and (max-height: 480px)': {
                overflowY: 'auto',
              },
            }}
          >
            <PrimaryButtons />

            <Accounts />
          </View>
        </View>
      </Resizable>
    </ErrorBoundary>
  );
}
