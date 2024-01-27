import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { closeBudget } from 'loot-core/client/actions';
import { send } from 'loot-core/platform/client/fetch';
import * as Platform from 'loot-core/src/client/platform';
import { type LocalPrefs } from 'loot-core/types/prefs';

import { useAccounts } from '../../hooks/useAccounts';
import { useActions } from '../../hooks/useActions';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useLocalPrefs } from '../../hooks/useLocalPrefs';
import { useNavigate } from '../../hooks/useNavigate';
import { SvgExpandArrow } from '../../icons/v0';
import { SvgReports, SvgWallet } from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Menu } from '../common/Menu';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';

import { Accounts } from './Accounts';
import { Item } from './Item';
import { useSidebar } from './SidebarProvider';
import { ToggleButton } from './ToggleButton';
import { Tools } from './Tools';

export const SIDEBAR_WIDTH = 240;

export function Sidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const sidebar = useSidebar();
  const accounts = useAccounts();
  const prefs = useLocalPrefs() || {};
  const isFloating = useGlobalPref('floatingSidebar') || false;

  const { getAccounts, replaceModal, savePrefs, saveGlobalPrefs } =
    useActions();

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

    await send('account-move', { id, targetId: targetIdToMove });
    await getAccounts();
  }

  const onFloat = () => {
    saveGlobalPrefs({ floatingSidebar: !isFloating });
  };

  const onAddAccount = () => {
    replaceModal('add-account');
  };

  const onToggleClosedAccounts = () => {
    savePrefs({
      'ui.showClosedAccounts': !prefs['ui.showClosedAccounts'],
    });
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
        <EditableBudgetName prefs={prefs} savePrefs={savePrefs} />

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

type EditableBudgetNameProps = {
  prefs: LocalPrefs;
  savePrefs: (prefs: Partial<LocalPrefs>) => Promise<void>;
};

function EditableBudgetName({ prefs, savePrefs }: EditableBudgetNameProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          defaultValue={prefs.budgetName}
          onEnter={async e => {
            const inputEl = e.target as HTMLInputElement;
            const newBudgetName = inputEl.value;
            if (newBudgetName.trim() !== '') {
              await savePrefs({
                budgetName: inputEl.value,
              });
              setEditing(false);
            }
          }}
          onBlur={() => setEditing(false)}
        />
      </InitialFocus>
    );
  } else {
    return (
      <Button
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
          {prefs.budgetName || 'A budget has no name'}
        </Text>
        <SvgExpandArrow width={7} height={7} style={{ marginLeft: 5 }} />
        {menuOpen && (
          <Tooltip
            position="bottom-left"
            style={{ padding: 0 }}
            onClose={() => setMenuOpen(false)}
          >
            <Menu onMenuSelect={onMenuSelect} items={items} />
          </Tooltip>
        )}
      </Button>
    );
  }
}
