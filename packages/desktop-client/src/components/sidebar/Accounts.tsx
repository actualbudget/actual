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
import { GroupAccount } from './GroupAccounts';
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
  const [accountGroupNested] = useLocalPref('ui.accountGroupNested');

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

  //Account view
  function normalAccount(account, i, nested = false) {
    return (
      <Account
        key={account.id}
        name={account.name}
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
        nested={nested}
      />
    );
  }

  //Places a group and its associated accounts.
  //if nested then group will be placed under the forbudgted/off budgted
  //headings within a highlighted group. Otherwise accounts will be under its own title
  //with accounts under that
  function groupPlacement(groupName, accounts, offBudget, nested = true) {
    //If we dont want nested
    if (!nested) {
      return (
        <div key={'groupBox-' + groupName}>
          <Account
            name={groupName}
            key={'groupHead-' + groupName}
            to="/accounts/budgeted"
            query={queries.getGroupBalance(groupName, offBudget)}
            grouped={true}
            style={{
              fontWeight,
              marginTop: 13,
              marginBottom: 5,
            }}
          />
          {accounts.map((account, ii) => normalAccount(account, ii))}
        </div>
      );
    }
    //if we are having nested
    return (
      <GroupAccount
        to="/"
        key={'group-' + groupName + '-' + offBudget}
        accounts={accounts.map((account, ii) =>
          normalAccount(account, ii, true),
        )}
        groupName={groupName}
        query={queries.getGroupBalance(groupName, offBudget)}
        onDragChange={onDragChange}
        onDrop={onReorder}
        outerStyle={makeDropPadding(0)}
        style={{ margin: '0', marginLeft: '2px' }}
      />
    );
  }

  //Goes thought the list of accounts to determine if there are grouped accounts
  //and seperates the non-grouped accounts and orgainses the grouped ones.
  function groupOrgainser(accounts) {
    const ungrouped = [];
    const grouped = {};

    //sorting
    for (let i = 0; i < accounts.length; i++) {
      if (accounts[i].account_group_id) {
        const groupName = accounts[i].account_group_id;
        if (grouped[groupName] === undefined) {
          grouped[groupName] = [accounts[i]];
        } else {
          grouped[groupName].push(accounts[i]);
        }
      } else {
        ungrouped.push(accounts[i]);
      }
    }
    return { grouped, ungrouped };
  }

  //This is the Sidebars UI placement for the accounts from budgeted and off budgeted
  //depending if the setting is nested or not will determine the style it will be displayed
  //and how off/on budget totals will be shown
  function sideBarDesign(nested = true) {
    const onbudget = groupOrgainser(budgetedAccounts);
    const offbudget = groupOrgainser(offbudgetAccounts);

    return (
      <>
        {(nested ? budgetedAccounts.length : onbudget['ungrouped'].length) >
          0 && (
          <Account
            name="For budget"
            to="/accounts/budgeted"
            query={
              nested
                ? queries.budgetedAccountBalance()
                : queries.getGroupBalance(null, false)
            }
            style={{
              fontWeight,
              marginTop: 13,
              marginBottom: 5,
            }}
          />
        )}

        {onbudget['ungrouped'].map((account, i) => normalAccount(account, i))}
        {Object.keys(onbudget['grouped']).map(nam =>
          groupPlacement(nam, onbudget['grouped'][nam], false, nested),
        )}

        {(nested ? offbudgetAccounts.length : offbudget['ungrouped'].length) >
          0 && (
          <Account
            name="Off budget"
            to="/accounts/offbudget"
            query={
              nested
                ? queries.offbudgetAccountBalance()
                : queries.getGroupBalance(null, true)
            }
            style={{
              fontWeight,
              marginTop: 13,
              marginBottom: 5,
            }}
          />
        )}

        {offbudget['ungrouped'].map((account, i) => normalAccount(account, i))}
        {Object.keys(offbudget['grouped']).map(nam =>
          groupPlacement(nam, offbudget['grouped'][nam], true, nested),
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

      {sideBarDesign(accountGroupNested ? true : false)}

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
