// @ts-strict-ignore
import React, { useState, useMemo } from 'react';

import { type AccountEntity } from 'loot-core/src/types/models';

import { SvgAdd } from '../../icons/v1';
import { View } from '../common/View';
import { type OnDropCallback } from '../sort';
import { type Binding } from '../spreadsheet';

import { Account } from './Account';
import { SecondaryItem } from './SecondaryItem';

const fontWeight = 600;

type AccountsProps = {
  accounts: AccountEntity[];
  failedAccounts: Map<
    string,
    {
      type: string;
      code: string;
    }
  >;
  updatedAccounts: string[];
  getAccountPath: (account: AccountEntity) => string;
  allAccountsPath: string;
  budgetedAccountPath: string;
  offBudgetAccountPath: string;
  getBalanceQuery: (account: AccountEntity) => Binding;
  getAllAccountBalance: () => Binding;
  getOnBudgetBalance: () => Binding;
  getOffBudgetBalance: () => Binding;
  showClosedAccounts: boolean;
  onAddAccount: () => void;
  onToggleClosedAccounts: () => void;
  onReorder: OnDropCallback;
};

export function Accounts({
  accounts,
  failedAccounts,
  updatedAccounts,
  getAccountPath,
  allAccountsPath,
  budgetedAccountPath,
  offBudgetAccountPath,
  getBalanceQuery,
  getAllAccountBalance,
  getOnBudgetBalance,
  getOffBudgetBalance,
  showClosedAccounts,
  onAddAccount,
  onToggleClosedAccounts,
  onReorder,
}: AccountsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const offbudgetAccounts = useMemo(
    () =>
      accounts.filter(
        account => account.closed === 0 && account.offbudget === 1,
      ),
    [accounts],
  );
  const budgetedAccounts = useMemo(
    () =>
      accounts.filter(
        account => account.closed === 0 && account.offbudget === 0,
      ),
    [accounts],
  );
  const closedAccounts = useMemo(
    () => accounts.filter(account => account.closed === 1),
    [accounts],
  );

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

  return (
    <View>
      <Account
        name="All accounts"
        to={allAccountsPath}
        query={getAllAccountBalance()}
        style={{ fontWeight, marginTop: 15 }}
      />

      {budgetedAccounts.length > 0 && (
        <Account
          name="For budget"
          to={budgetedAccountPath}
          query={getOnBudgetBalance()}
          style={{ fontWeight, marginTop: 13 }}
        />
      )}

      {budgetedAccounts.map((account, i) => (
        <Account
          key={account.id}
          name={account.name}
          account={account}
          connected={!!account.bank}
          failed={failedAccounts && failedAccounts.has(account.id)}
          updated={updatedAccounts && updatedAccounts.includes(account.id)}
          to={getAccountPath(account)}
          query={getBalanceQuery(account)}
          onDragChange={onDragChange}
          onDrop={onReorder}
          outerStyle={makeDropPadding(i)}
        />
      ))}

      {offbudgetAccounts.length > 0 && (
        <Account
          name="Off budget"
          to={offBudgetAccountPath}
          query={getOffBudgetBalance()}
          style={{ fontWeight, marginTop: 13 }}
        />
      )}

      {offbudgetAccounts.map((account, i) => (
        <Account
          key={account.id}
          name={account.name}
          account={account}
          connected={!!account.bank}
          failed={failedAccounts && failedAccounts.has(account.id)}
          updated={updatedAccounts && updatedAccounts.includes(account.id)}
          to={getAccountPath(account)}
          query={getBalanceQuery(account)}
          onDragChange={onDragChange}
          onDrop={onReorder}
          outerStyle={makeDropPadding(i)}
        />
      ))}

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
            query={getBalanceQuery(account)}
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
