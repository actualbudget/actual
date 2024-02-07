// @ts-strict-ignore
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';
import { type AccountState } from 'loot-core/client/state-types/account';
import { type PrefsState } from 'loot-core/client/state-types/prefs';
import { type QueriesState } from 'loot-core/client/state-types/queries';
import { closeBudget } from 'loot-core/src/client/actions/budgets';
import * as Platform from 'loot-core/src/client/platform';
import * as queries from 'loot-core/src/client/queries';
import { send } from 'loot-core/src/platform/client/fetch';
import { type LocalPrefs } from 'loot-core/src/types/prefs';

import { useActions } from '../../hooks/useActions';
import { useNavigate } from '../../hooks/useNavigate';
import { SvgExpandArrow } from '../../icons/v0';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Menu } from '../common/Menu';
import { Text } from '../common/Text';
import { Tooltip } from '../tooltips';

import { Sidebar } from './Sidebar';

type EditableBudgetNameProps = {
  prefs: LocalPrefs;
  savePrefs: (prefs: Partial<LocalPrefs>) => Promise<void>;
};

function EditableBudgetName({ prefs, savePrefs }: EditableBudgetNameProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function onMenuSelect(type) {
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

  const onSaveChanges = async e => {
    const inputEl = e.target;
    const newBudgetName = inputEl.value;
    if (newBudgetName.trim() !== '') {
      await savePrefs({
        budgetName: inputEl.value,
      });
      setEditing(false);
    }
  };

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
          onEnter={onSaveChanges}
          onBlur={onSaveChanges}
          onEscape={() => setEditing(false)}
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

export function SidebarWithData() {
  const accounts = useSelector<State, QueriesState['accounts']>(
    state => state.queries.accounts,
  );
  const failedAccounts = useSelector<State, AccountState['failedAccounts']>(
    state => state.account.failedAccounts,
  );
  const updatedAccounts = useSelector<State, QueriesState['updatedAccounts']>(
    state => state.queries.updatedAccounts,
  );
  const prefs = useSelector<State, LocalPrefs>(state => state.prefs.local);
  const floatingSidebar = useSelector<
    State,
    PrefsState['global']['floatingSidebar']
  >(state => state.prefs.global.floatingSidebar);

  const { getAccounts, replaceModal, savePrefs, saveGlobalPrefs } =
    useActions();

  useEffect(() => void getAccounts(), [getAccounts]);

  async function onReorder(id, dropPos, targetId) {
    if (dropPos === 'bottom') {
      const idx = accounts.findIndex(a => a.id === targetId) + 1;
      targetId = idx < accounts.length ? accounts[idx].id : null;
    }

    await send('account-move', { id, targetId });
    await getAccounts();
  }

  return (
    <Sidebar
      budgetName={<EditableBudgetName prefs={prefs} savePrefs={savePrefs} />}
      isFloating={floatingSidebar}
      accounts={accounts}
      failedAccounts={failedAccounts}
      updatedAccounts={updatedAccounts}
      getBalanceQuery={queries.accountBalance}
      getAllAccountBalance={queries.allAccountBalance}
      getOnBudgetBalance={queries.budgetedAccountBalance}
      getOffBudgetBalance={queries.offbudgetAccountBalance}
      onFloat={() => saveGlobalPrefs({ floatingSidebar: !floatingSidebar })}
      onReorder={onReorder}
      onAddAccount={() => replaceModal('add-account')}
      showClosedAccounts={prefs['ui.showClosedAccounts']}
      onToggleClosedAccounts={() =>
        savePrefs({
          'ui.showClosedAccounts': !prefs['ui.showClosedAccounts'],
        })
      }
      style={{
        flex: 1,
        ...styles.darkScrollbar,
      }}
    />
  );
}
