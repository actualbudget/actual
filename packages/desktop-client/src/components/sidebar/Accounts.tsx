// @ts-strict-ignore
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import * as queries from 'loot-core/src/client/queries';
import { type State } from 'loot-core/src/client/state-types';

import { useBudgetedAccounts } from '../../hooks/useBudgetedAccounts';
import { useClosedAccounts } from '../../hooks/useClosedAccounts';
import { useFailedAccounts } from '../../hooks/useFailedAccounts';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useOffBudgetAccounts } from '../../hooks/useOffBudgetAccounts';
import { useUpdatedAccounts } from '../../hooks/useUpdatedAccounts';
import { SvgAdd } from '../../icons/v1';
import { View } from '../common/View';
import { type OnDropCallback } from '../sort';

import { Account } from './Account';
import { SecondaryItem } from './SecondaryItem';

const fontWeight = 600;

type AccountsProps = {
  onAddAccount: () => void;
  onToggleClosedAccounts: () => void;
  onReorder: OnDropCallback;
};

export function Accounts({
  onAddAccount,
  onToggleClosedAccounts,
  onReorder,
}: AccountsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const failedAccounts = useFailedAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const offbudgetAccounts = useOffBudgetAccounts();
  const budgetedAccounts = useBudgetedAccounts();
  const closedAccounts = useClosedAccounts();
  const syncingAccountIds = useSelector(
    (state: State) => state.account.accountsSyncing,
  );

  const getAccountPath = account => `/accounts/${account.id}`;

  const [showClosedAccounts] = useLocalPref('ui.showClosedAccounts');

  function onDragChange(drag) {
    setIsDragging(drag.state === 'start');
  }

  const makeDropPadding = i => {
    if (i === 0) {
      return {
        paddingTop: isDragging ? 15 : 0,
        marginTop: isDragging ? -15 : 0,
      };
    }
    return null;
  };

  //Returns the name Of the Account removing group name
  function processName(name) {
    if (getGroup(name) === '') {
      return name;
    }
    return name.substring(name.indexOf(']') + 1);
  }

  //Returns the account group name if there is one, otherwise returns empty string
  function getGroup(name) {
    if (name[0] === '[') {
      return name.substring(1, name.indexOf(']'));
    }
    return '';
  }

  //Account view
  function normalAccount(account, i) {
    return (
      <Account
        key={account.id}
        name={processName(account.name)}
        account={account}
        connected={!!account.bank}
        pending={syncingAccountIds.includes(account.id)}
        failed={failedAccounts && failedAccounts.has(account.id)}
        updated={updatedAccounts && updatedAccounts.includes(account.id)}
        to={getAccountPath(account)}
        query={queries.accountBalance(account)}
        onDragChange={onDragChange}
        onDrop={onReorder}
        outerStyle={makeDropPadding(i)}
      />
    );
  }

  //Places a group and its associated accounts.
  function groupPlacement(groupName, accounts, offBudget) {
    return (
      <div key={groupName + '-groupdiv-' + offBudget}>
        <div
          key={groupName + '-titleBackgounrdDiv-' + offBudget}
          style={{
            width: '100%',
            position: 'absolute',
            backgroundColor: 'rgba(255,255,255,.05',
            height: '2.15em',
            left: '1em',
            margin: '0',
            borderTopLeftRadius: '7px',
          }}
        />
        <Account
          to="/"
          name={groupName}
          query={queries.getGroupBalance(groupName, offBudget)}
          onDragChange={onDragChange}
          onDrop={onReorder}
          outerStyle={makeDropPadding(0)}
          grouped={true}
          style={{ margin: '0', marginLeft: '2px' }}
        />

        <div
          key={groupName + '-AccountBackgroundDiv-' + offBudget}
          style={{
            width: 'auto',
            marginLeft: '1em',
            marginTop: '0px',
            marginBottom: '10px',
            borderBottomLeftRadius: '7px',
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          {accounts.map((account, ii) => normalAccount(account, ii))}
        </div>
      </div>
    );
  }

  //Goes thought the list of accounts to determine if there are grouped accounts
  //and seperates the non-grouped accounts and orgainses the grouped ones.
  function groupOrgainser(accounts, offBudget) {
    const ungrouped = [];
    const grouped = {};

    //sorting
    for (let i = 0; i < accounts.length; i++) {
      if (getGroup(accounts[i].name).length > 0) {
        const groupName = getGroup(accounts[i].name);
        if (grouped[groupName] === undefined) {
          grouped[groupName] = [accounts[i]];
        } else {
          grouped[groupName].push(accounts[i]);
        }
      } else {
        ungrouped.push(accounts[i]);
      }
    }
    //spiting out the accounts
    return (
      <>
        {ungrouped.map((account, i) => normalAccount(account, i))}
        {Object.keys(grouped).map(nam =>
          groupPlacement(nam, grouped[nam], offBudget),
        )}
      </>
    );
  }

  return (
    <View>
      <Account
        name="All accounts"
        to="/accounts"
        query={queries.allAccountBalance()}
        style={{ fontWeight, marginTop: 15 }}
      />

      {budgetedAccounts.length > 0 && (
        <Account
          name="For budget"
          to="/accounts/budgeted"
          query={queries.budgetedAccountBalance()}
          style={{
            fontWeight,
            marginTop: 13,
            marginBottom: 5,
          }}
        />
      )}

      {groupOrgainser(budgetedAccounts, false)}

      {offbudgetAccounts.length > 0 && (
        <Account
          name="Off budget"
          to="/accounts/offbudget"
          query={queries.offbudgetAccountBalance()}
          style={{
            fontWeight,
            marginTop: 13,
            marginBottom: 5,
          }}
        />
      )}

      {groupOrgainser(offbudgetAccounts, true)}

      {closedAccounts.length > 0 && (
        <SecondaryItem
          style={{ marginTop: 15 }}
          title={'Closed accounts' + (showClosedAccounts ? '' : '...')}
          onClick={onToggleClosedAccounts}
          bold
        />
      )}

      {showClosedAccounts &&
        closedAccounts.map(account => (
          <Account
            key={account.id}
            name={account.name}
            account={account}
            to={getAccountPath(account)}
            query={queries.accountBalance(account)}
            onDragChange={onDragChange}
            onDrop={onReorder}
          />
        ))}

      <SecondaryItem
        style={{
          marginTop: 15,
          marginBottom: 9,
        }}
        onClick={onAddAccount}
        Icon={SvgAdd}
        title="Add account"
      />
    </View>
  );
}
