import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Resizable } from 're-resizable';

import {
  closeBudget,
  moveAccount,
  replaceModal,
} from 'loot-core/src/client/actions';
import * as Platform from 'loot-core/src/client/platform';

import { useAccounts } from '../../hooks/useAccounts';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { SvgArrowLeft, SvgBackward, SvgBackwardStep, SvgCog, SvgMoveBack, SvgReports, SvgUser, SvgWallet } from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { View } from '../common/View';
import { useSidebar } from '../sidebar/SidebarProvider';
import { ToggleButton } from '../sidebar/ToggleButton';
import { Item } from '../sidebar/Item';
import { SvgRole } from '../../icons/v1/Role';
import { useNavigate } from '../../hooks/useNavigate';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { SvgExpandArrow } from '../../icons/v0';
import { Popover } from '../common/Popover';
import { Menu } from '../common/Menu';
import { SecondaryItem } from '../sidebar/SecondaryItem';

export function AdminSidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const dispatch = useDispatch();
  const sidebar = useSidebar();
  const accounts = useAccounts();
  const { width } = useResponsive();
  const [isFloating = false, setFloatingSidebarPref] =
    useGlobalPref('floatingSidebar');

  const [_sidebarWidth, setSidebarWidth] = useLocalPref('sidebarWidth');
  const DEFAULT_SIDEBAR_WIDTH = 240;
  const MAX_SIDEBAR_WIDTH = width / 3;
  const MIN_SIDEBAR_WIDTH = 200;
  const sidebarWidth = Math.min(
    MAX_SIDEBAR_WIDTH,
    Math.max(MIN_SIDEBAR_WIDTH, _sidebarWidth || DEFAULT_SIDEBAR_WIDTH),
  );

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

  const containerRef = useResizeObserver(rect => {
    setSidebarWidth(rect.width);
  });

  return (
    <Resizable
      defaultSize={{
        width: sidebarWidth,
        height: '100%',
      }}
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
          flex: 1,
          ...styles.darkScrollbar,
        }}
      >
        <View
          style={{
            paddingTop: 35,
            height: 30,
            flexDirection: 'row',
            alignItems: 'center',
            margin: '0 8px 23px 20px',
            transition: 'padding .4s',
            ...(hasWindowButtons && {
              paddingTop: 20,
              justifyContent: 'flex-start',
            }),
          }}
        >
          <AdminDashboardTitle />

          <View style={{ flex: 1, flexDirection: 'row' }} />

          {!sidebar.alwaysFloats && (
            <ToggleButton isFloating={isFloating} onFloat={onFloat} />
          )}
        </View>

        <View style={{ overflow: 'auto' }}>
          <Item title="Users" Icon={SvgUser} to="/admin/users" />
          <Item title="Roles" Icon={SvgCog} to="/admin/roles" />

          <View
            style={{
              height: 1,
              backgroundColor: theme.sidebarItemBackgroundHover,
              marginTop: 15,
              flexShrink: 0,
            }}
          />

          <SecondaryItem
            title="Back to Budget"
            Icon={SvgArrowLeft}
            to="/"
            indent={0}
          />
        </View>
      </View>
    </Resizable>
  );
}

function AdminDashboardTitle() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [budgetName, setBudgetNamePref] = useLocalPref('budgetName');
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  function onMenuSelect(type: string) {
    setMenuOpen(false);

    switch (type) {
      case 'settings':
        navigate('~/settings');
        break;
      case 'help':
        window.open('https://actualbudget.org/docs/', '_blank');
        break;
      default:
    }
  }

  const items = [
    { name: 'settings', text: 'Settings' },
    ...(Platform.isBrowser ? [{ name: 'help', text: 'Help' }] : []),
  ];

  return (
    <>
      <Button
        ref={triggerRef}
        type="bare"
        color={theme.buttonNormalBorder}
        style={{
          fontSize: 16,
          fontWeight: 500,
          marginLeft: -5,
          flex: '0 auto',
        }}
        onClick={() => setMenuOpen(true)}
      >
        <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
          Actual Budget Admin
        </Text>
        <SvgExpandArrow width={7} height={7} style={{ marginLeft: 5 }} />
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu onMenuSelect={onMenuSelect} items={items} />
      </Popover>
    </>
  );
}
