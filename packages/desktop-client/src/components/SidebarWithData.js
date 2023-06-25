import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { closeBudget } from 'loot-core/src/client/actions/budgets';
import * as Platform from 'loot-core/src/client/platform';
import * as queries from 'loot-core/src/client/queries';
import { send } from 'loot-core/src/platform/client/fetch';

import ExpandArrow from '../icons/v0/ExpandArrow';
import { styles, colors } from '../style';

import { Button, Input, InitialFocus, Text, Tooltip, Menu } from './common';
import { Sidebar } from './sidebar';

function EditableBudgetName({ prefs, savePrefs }) {
  let dispatch = useDispatch();
  let navigate = useNavigate();
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

  let items = [
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
            const newBudgetName = e.target.value;
            if (newBudgetName.trim() !== '') {
              await savePrefs({
                budgetName: e.target.value,
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
        bare
        style={{
          color: colors.n9,
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
        <ExpandArrow
          width={7}
          height={7}
          style={{ color: 'inherit', marginLeft: 5 }}
        />
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

function SidebarWithData({
  accounts,
  failedAccounts,
  updatedAccounts,
  replaceModal,
  prefs,
  floatingSidebar,
  savePrefs,
  saveGlobalPrefs,
  getAccounts,
}) {
  useEffect(() => void getAccounts(), [getAccounts]);

  async function onReorder(id, dropPos, targetId) {
    if (dropPos === 'bottom') {
      let idx = accounts.findIndex(a => a.id === targetId) + 1;
      targetId = idx < accounts.length ? accounts[idx].id : null;
    }

    await send('account-move', { id, targetId });
    await getAccounts();
  }

  return (
    <Sidebar
      isFloating={floatingSidebar}
      budgetName={<EditableBudgetName prefs={prefs} savePrefs={savePrefs} />}
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
      style={[{ flex: 1 }, styles.darkScrollbar]}
    />
  );
}

export default connect(
  state => ({
    accounts: state.queries.accounts,
    failedAccounts: state.account.failedAccounts,
    updatedAccounts: state.queries.updatedAccounts,
    prefs: state.prefs.local,
    floatingSidebar: state.prefs.global.floatingSidebar,
  }),
  dispatch => bindActionCreators(actions, dispatch),
)(SidebarWithData);
