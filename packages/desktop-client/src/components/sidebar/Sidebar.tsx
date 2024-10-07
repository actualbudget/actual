import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { Resizable } from 're-resizable';

import { moveAccount, replaceModal } from 'loot-core/src/client/actions';
import * as Platform from 'loot-core/src/client/platform';

import { useAccounts } from '../../hooks/useAccounts';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { SvgReports, SvgWallet } from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { View } from '../common/View';

import { Accounts } from './Accounts';
import { BudgetName } from './BudgetName';
import { Item } from './Item';
import { useSidebar } from './SidebarProvider';
import { ToggleButton } from './ToggleButton';
import { Tools } from './Tools';

export function Sidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const sidebar = useSidebar();
  const accounts = useAccounts();
  const { width } = useResponsive();
  const [showClosedAccounts, setShowClosedAccountsPref] = useLocalPref(
    'ui.showClosedAccounts',
  );
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

  async function onReorder(
    id: string,
    dropPos: 'top' | 'bottom',
    targetId: unknown,
  ) {
    let targetIdToMove = targetId;
    if (dropPos === 'bottom') {
      const idx = accounts.findIndex(a => a.id === targetId) + 1;
      targetIdToMove = idx < accounts.length ? accounts[idx].id : null;
    }

    dispatch(moveAccount(id, targetIdToMove));
  }

  const onFloat = () => {
    setFloatingSidebarPref(!isFloating);
  };

  const onAddAccount = () => {
    dispatch(replaceModal('add-account'));
  };

  const onToggleClosedAccounts = () => {
    setShowClosedAccountsPref(!showClosedAccounts);
  };

  const containerRef = useResizeObserver(rect => {
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
        style={{
          color: theme.sidebarItemText,
          height: '100%',
          backgroundColor: theme.sidebarBackground,
          '& .float': {
            opacity: isFloating ? 1 : 0,
            transition: 'opacity .25s, width .25s',
            width: hasWindowButtons || isFloating ? null : 0,
          },
          '&:hover .float': {
            opacity: 1,
            width: hasWindowButtons ? null : 'auto',
          },
          '& .hover-visible': {
            display: 'none',
          },
          '&:hover .hover-visible': {
            display: 'flex',
          },
          flex: 1,
          ...styles.darkScrollbar,
        }}
      >
        <BudgetName>
          {!sidebar.alwaysFloats && (
            <ToggleButton isFloating={isFloating} onFloat={onFloat} />
          )}
        </BudgetName>

        <View style={{ overflow: 'auto' }}>
          <Item title={t('Budget')} Icon={SvgWallet} to="/budget" />
          <Item title={t('Reports')} Icon={SvgReports} to="/reports" />

          <Item title={t('Schedules')} Icon={SvgCalendar} to="/schedules" />

          <Tools />

          <View
            style={{
              height: 1,
              backgroundColor: theme.sidebarItemBackgroundHover,
              marginTop: 15,
              flexShrink: 0,
            }}
          />

          <Accounts
            onAddAccount={onAddAccount}
            onToggleClosedAccounts={onToggleClosedAccounts}
            onReorder={onReorder}
          />
        </View>
      </View>
    </Resizable>
  );
}
