import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  closeBudget,
  moveAccount,
  replaceModal,
} from 'loot-core/src/client/actions';
import * as Platform from 'loot-core/src/client/platform';

import { useAccounts } from '../../hooks/useAccounts';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useNavigate } from '../../hooks/useNavigate';
import { SvgExpandArrow } from '../../icons/v0';
import { SvgReports, SvgWallet } from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Accounts } from './Accounts';
import { Item } from './Item';
import { useSidebar } from './SidebarProvider';
import { ToggleButton } from './ToggleButton';
import { Tools } from './Tools';

export const SIDEBAR_WIDTH = 240;

export function Sidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const dispatch = useDispatch();
  const sidebar = useSidebar();
  const accounts = useAccounts();
  const [showClosedAccounts, setShowClosedAccountsPref] = useLocalPref(
    'ui.showClosedAccounts',
  );
  const [isFloating = false, setFloatingSidebarPref] =
    useGlobalPref('floatingSidebar');

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

  return (
    <View
      style={{
        width: SIDEBAR_WIDTH,
        color: theme.sidebarItemText,
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
        <EditableBudgetName />

        <View style={{ flex: 1, flexDirection: 'row' }} />

        {!sidebar.alwaysFloats && (
          <ToggleButton isFloating={isFloating} onFloat={onFloat} />
        )}
      </View>

      <View style={{ overflow: 'auto' }}>
        <Item title="Budget" Icon={SvgWallet} to="/budget" />
        <Item title="Reports" Icon={SvgReports} to="/reports" />

        <Item title="Schedules" Icon={SvgCalendar} to="/schedules" />

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
  );
}

function EditableBudgetName() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [budgetName, setBudgetNamePref] = useLocalPref('budgetName');
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  function onMenuSelect(type: string) {
    setMenuOpen(false);

    switch (type) {
      case 'rename':
        setEditing(true);
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'help':
        window.open('https://actualbudget.org/docs/', '_blank');
        break;
      case 'close':
        dispatch(closeBudget());
        break;
      default:
    }
  }

  const items = [
    { name: 'rename', text: 'Rename budget' },
    { name: 'settings', text: 'Settings' },
    ...(Platform.isBrowser ? [{ name: 'help', text: 'Help' }] : []),
    { name: 'close', text: 'Close file' },
  ];

  if (editing) {
    return (
      <InitialFocus>
        <Input
          style={{
            width: 160,
            fontSize: 16,
            fontWeight: 500,
          }}
          defaultValue={budgetName}
          onEnter={async e => {
            const inputEl = e.target as HTMLInputElement;
            const newBudgetName = inputEl.value;
            if (newBudgetName.trim() !== '') {
              setBudgetNamePref(newBudgetName);
              setEditing(false);
            }
          }}
          onBlur={() => setEditing(false)}
        />
      </InitialFocus>
    );
  }

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
          {budgetName || 'A budget has no name'}
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
