import React, { useRef } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type AccountEntity,
  type CategoryGroupEntity,
  type PayeeEntity,
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useProperFocus } from '../../../../hooks/useProperFocus';

import { Transaction } from './Transaction';
import { TransactionError } from './TransactionError';

type NewTransactionProps = {
  accounts: AccountEntity[];
  balance: number;
  categoryGroups: CategoryGroupEntity[];
  dateFormat: string;
  editingTransaction: TransactionEntity['id'];
  focusedField: string;
  hideFraction?: boolean;
  onAdd: () => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  onClose: () => void;
  onCreatePayee: (name: string) => Promise<PayeeEntity['id']>;
  onDelete: (id: TransactionEntity['id']) => void;
  onDistributeRemainder: (id: TransactionEntity['id']) => void;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onManagePayees: (id: PayeeEntity['id'] | undefined) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  onSave: (
    tx: TransactionEntity,
    subTxs: TransactionEntity[] | null,
    name: string,
  ) => void;
  onSplit: (id: TransactionEntity['id']) => void;
  payees: PayeeEntity[];
  showAccount?: boolean;
  showBalance?: boolean;
  showCleared?: boolean;
  transactions: TransactionEntity[];
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity | null;
  };
};

export function NewTransaction({
  accounts,
  balance,
  categoryGroups,
  dateFormat,
  editingTransaction,
  focusedField,
  hideFraction,
  onAdd,
  onAddSplit,
  onClose,
  onCreatePayee,
  onDelete,
  onDistributeRemainder,
  onEdit,
  onManagePayees,
  onNavigateToSchedule,
  onNavigateToTransferAccount,
  onNotesTagClick,
  onSave,
  onSplit,
  payees,
  showAccount,
  showBalance,
  showCleared,
  transactions,
  transferAccountsByTransaction,
}: NewTransactionProps) {
  const error = transactions[0].error;
  const isDeposit = transactions[0].amount > 0;

  const childTransactions = transactions.filter(
    t => t.parent_id === transactions[0].id,
  );
  const emptyChildTransactions = childTransactions.filter(t => t.amount === 0);

  const addButtonRef = useRef<HTMLButtonElement>(null);
  useProperFocus(addButtonRef, focusedField === 'add');
  const cancelButtonRef = useRef(null);
  useProperFocus(cancelButtonRef, focusedField === 'cancel');

  return (
    <View
      style={{
        borderBottom: '1px solid ' + theme.tableBorderHover,
        paddingBottom: 6,
        backgroundColor: theme.tableBackground,
      }}
      data-testid="new-transaction"
      onKeyDown={e => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      {transactions.map(transaction => (
        <Transaction
          key={transaction.id}
          editing={editingTransaction === transaction.id}
          transaction={transaction}
          subtransactions={transaction.is_parent ? childTransactions : null}
          transferAccountsByTransaction={transferAccountsByTransaction}
          showAccount={showAccount}
          showBalance={showBalance}
          showCleared={showCleared}
          focusedField={
            editingTransaction === transaction.id ? focusedField : undefined
          }
          showZeroInDeposit={isDeposit}
          accounts={accounts}
          categoryGroups={categoryGroups}
          payees={payees}
          dateFormat={dateFormat}
          hideFraction={hideFraction}
          expanded={true}
          onEdit={onEdit}
          onSave={onSave}
          onSplit={onSplit}
          onDelete={onDelete}
          onManagePayees={onManagePayees}
          onCreatePayee={onCreatePayee}
          style={{ marginTop: -1 }}
          onNavigateToTransferAccount={onNavigateToTransferAccount}
          onNavigateToSchedule={onNavigateToSchedule}
          onNotesTagClick={onNotesTagClick}
          balance={balance}
          showSelection={true}
          allowSplitTransaction={true}
        />
      ))}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 6,
          marginRight: 20,
        }}
      >
        <Button
          style={{ marginRight: 10, padding: '4px 10px' }}
          onPress={() => onClose()}
          data-testid="cancel-button"
          ref={cancelButtonRef}
        >
          <Trans>Cancel</Trans>
        </Button>
        {error ? (
          <TransactionError
            error={error}
            isDeposit={isDeposit}
            onAddSplit={() => onAddSplit(transactions[0].id)}
            onDistributeRemainder={() =>
              onDistributeRemainder(transactions[0].id)
            }
            canDistributeRemainder={emptyChildTransactions.length > 0}
          />
        ) : (
          <Button
            variant="primary"
            style={{ padding: '4px 10px' }}
            onPress={onAdd}
            data-testid="add-button"
            ref={addButtonRef}
          >
            <Trans>Add</Trans>
          </Button>
        )}
      </View>
    </View>
  );
}
