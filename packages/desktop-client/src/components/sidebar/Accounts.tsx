// @ts-strict-ignore
import React, { useMemo } from 'react';

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { type AccountEntity } from 'loot-core/src/types/models';

import { SvgAdd } from '../../icons/v1';
import { View } from '../common/View';
import { type Binding } from '../spreadsheet';
import { getDropPosition } from '../util/sort';

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
  onReorder: (id: string, dropPos: 'top' | 'bottom', targetId: string) => void;
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

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = e => {
    const { active, over } = e;

    if (active.id !== over.id) {
      const dropPos = getDropPosition(
        active.rect.current.translated,
        active.rect.current.initial,
      );

      onReorder(active.id, dropPos, over.id);
    }
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={budgetedAccounts}
          strategy={verticalListSortingStrategy}
        >
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
            />
          ))}
        </SortableContext>
      </DndContext>

      {offbudgetAccounts.length > 0 && (
        <Account
          name="Off budget"
          to={offBudgetAccountPath}
          query={getOffBudgetBalance()}
          style={{ fontWeight, marginTop: 13 }}
        />
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={offbudgetAccounts}
          strategy={verticalListSortingStrategy}
        >
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
            />
          ))}
        </SortableContext>
      </DndContext>

      {closedAccounts.length > 0 && (
        <SecondaryItem
          style={{ marginTop: 15 }}
          title={'Closed accounts' + (showClosedAccounts ? '' : '...')}
          onClick={onToggleClosedAccounts}
          bold
        />
      )}

      {showClosedAccounts && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={offbudgetAccounts}
            strategy={verticalListSortingStrategy}
          >
            {closedAccounts.map((account, i) => (
              <Account
                key={account.id}
                name={account.name}
                account={account}
                to={getAccountPath(account)}
                query={getBalanceQuery(account)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

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
