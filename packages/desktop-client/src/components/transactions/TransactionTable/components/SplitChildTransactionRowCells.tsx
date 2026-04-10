import type { TransactionRowContentProps } from '../types';

import {
  AmountCell,
  BalanceCell,
  CategoryCell,
  NotesCell,
  PayeeCell,
  StatusCell,
} from './cells';

import { Cell, Field, SelectCell } from '@desktop-client/components/table';
import { theme } from '@actual-app/components/theme';

export function SplitChildTransactionRowCells({
  transaction,
  focusedField,
  selected,
  categoryGroups,
  payees,
  showCleared,
  showAccount,
  showBalances,
  showCategory,
  hideFraction,
  isPreview,
  category,
  payee,
  transferAccount,
  schedule,
  notesValue,
  onEdit,
  onUpdate,
  onSelect,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onManagePayees,
  showSelection,
}: TransactionRowContentProps) {
  return (
    <>
      {showSelection && !isPreview ? (
        <SelectCell
          exposed
          focused={focusedField === 'select'}
          selected={selected}
          width={20}
          onSelect={onSelect}
          onEdit={() => onEdit(transaction.id, 'select')}
          style={{ borderLeftWidth: 1 }}
        />
      ) : (
        <Cell width={20} />
      )}

      <Field
        width={110}
        style={{
          width: 110,
          marginLeft: -5,
          backgroundColor: theme.tableRowBackgroundHover,
          border: 0,
        }}
      />

      {showAccount && (
        <Field
          style={{
            flex: 1,
            marginLeft: -5,
            backgroundColor: theme.tableRowBackgroundHover,
            border: 0,
          }}
        />
      )}

      <PayeeCell
        id={transaction.id}
        payee={payee}
        transferAccount={transferAccount}
        schedule={schedule}
        payees={payees}
        focused={focusedField === 'payee'}
        exposed={focusedField === 'payee'}
        isPreview={isPreview}
        onEdit={onEdit}
        onUpdate={onUpdate}
        onManagePayees={onManagePayees}
        onNavigateToTransferAccount={onNavigateToTransferAccount}
        onNavigateToSchedule={onNavigateToSchedule}
      />

      <NotesCell
        id={transaction.id}
        notes={notesValue}
        focused={focusedField === 'notes'}
        exposed={focusedField === 'notes'}
        isPreview={isPreview}
        onEdit={onEdit}
        onUpdate={onUpdate}
      />

      {showCategory && (
        <CategoryCell
          id={transaction.id}
          category={category}
          categoryGroups={categoryGroups}
          focused={focusedField === 'category'}
          exposed={focusedField === 'category'}
          isPreview={isPreview}
          onEdit={onEdit}
          onUpdate={onUpdate}
          showSplitOption={false}
        />
      )}

      <AmountCell
        id={transaction.id}
        amount={transaction.amount}
        type="debit"
        focused={focusedField === 'debit'}
        exposed={focusedField === 'debit'}
        hideFraction={hideFraction}
        isPreview={isPreview}
        onEdit={onEdit}
        onUpdate={onUpdate}
      />

      <AmountCell
        id={transaction.id}
        amount={transaction.amount}
        type="credit"
        focused={focusedField === 'credit'}
        exposed={focusedField === 'credit'}
        hideFraction={hideFraction}
        isPreview={isPreview}
        onEdit={onEdit}
        onUpdate={onUpdate}
      />

      {showBalances && (
        <BalanceCell
          id={transaction.id}
          balance={null}
          hideFraction={hideFraction}
        />
      )}

      {showCleared && (
        <StatusCell
          id={transaction.id}
          status={transaction.cleared ? 'cleared' : null}
          focused={focusedField === 'cleared'}
          selected={selected}
          isChild
          isPreview={isPreview}
          onEdit={onEdit}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
