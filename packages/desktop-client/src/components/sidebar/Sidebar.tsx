import React, { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { css } from '@emotion/css';
import { Resizable } from 're-resizable';

import { replaceModal } from 'loot-core/src/client/actions';
import * as Platform from 'loot-core/src/client/platform';

import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { SvgAdd } from '../../icons/v1';
import { styles, theme } from '../../style';
import { View } from '../common/View';
import { useResponsive } from '../responsive/ResponsiveProvider';

import { Accounts } from './Accounts';
import { BudgetName } from './BudgetName';
import { PrimaryButtons } from './PrimaryButtons';
import { SecondaryButtons } from './SecondaryButtons';
import { useSidebar } from './SidebarProvider';
import { ToggleButton } from './ToggleButton';

export function Sidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const { t } = useTranslation();
  const dispatch = useDispatch();
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

  const onAddAccount = () => {
    dispatch(replaceModal('add-account'));
  };

  const containerRef = useResizeObserver<HTMLDivElement>(rect => {
    setSidebarWidth(rect.width);
  });

  return (
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

          <SecondaryButtons
            buttons={[
              { title: t('Add account'), Icon: SvgAdd, onClick: onAddAccount },
            ]}
          />
        </View>
      </View>
    </Resizable>
  );
}
