import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import * as queries from 'loot-core/src/client/queries';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  Button,
  Input,
  InitialFocus,
  Text
} from 'loot-design/src/components/common';
import { Sidebar } from 'loot-design/src/components/sidebar';
import { styles, colors } from 'loot-design/src/style';

function EditableBudgetName({ prefs, savePrefs }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <InitialFocus>
        <Input
          style={{
            width: 160,
            fontSize: 16,
            fontWeight: 500
          }}
          defaultValue={prefs.budgetName}
          onEnter={async e => {
            const newBudgetName = e.target.value;
            if (newBudgetName.trim() !== '') {
              await savePrefs({
                budgetName: e.target.value
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
          flex: '0 auto'
        }}
        onClick={() => setEditing(true)}
      >
        <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {prefs.budgetName || 'A budget has no name'}
        </Text>
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
  getAccounts
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
      onAddAccount={() =>
        replaceModal(
          prefs['flags.syncAccount'] ? 'add-account' : 'add-local-account'
        )
      }
      showClosedAccounts={prefs['ui.showClosedAccounts']}
      onToggleClosedAccounts={() =>
        savePrefs({
          'ui.showClosedAccounts': !prefs['ui.showClosedAccounts']
        })
      }
      style={[{ flex: 1 }, styles.darkScrollbar]}
    />
  );
}

export default withRouter(
  connect(
    state => ({
      accounts: state.queries.accounts,
      failedAccounts: state.account.failedAccounts,
      updatedAccounts: state.queries.updatedAccounts,
      prefs: state.prefs.local,
      floatingSidebar: state.prefs.global.floatingSidebar
    }),
    dispatch => bindActionCreators(actions, dispatch)
  )(SidebarWithData)
);
