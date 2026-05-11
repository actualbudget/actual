import { theme } from '@actual-app/components/theme';

import { Cell, Field } from '#components/table';
import type { TransactionRowContentProps } from '#components/transactions/TransactionTable/types';

import {
  AmountCell,
  BalanceCell,
  CategoryCell,
  NotesCell,
  PayeeCell,
  StatusCell,
} from './cells';

/* eslint-disable no-unused-vars */
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
  onSelect, // unused for child rows
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onManagePayees,
  showSelection, // unused for child rows
  columnWidths,
}: TransactionRowContentProps) {
  /* eslint-enable no-unused-vars */
  return (
    <>
      {/* Child transactions should never show SelectCell, only empty Cell */}
      <Cell width={20} style={{ borderLeftWidth: 1 }} />

      <Field
        width={columnWidths.date}
        style={{
          marginLeft: -5,
          backgroundColor: theme.tableRowBackgroundHover,
          border: 0,
        }}
      />

      {showAccount && (
        <Field
          width={columnWidths.account}
          style={{
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
        width={columnWidths.payee}
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
        width={columnWidths.notes}
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
          width={columnWidths.category}
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
        width={columnWidths.payment}
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
        width={columnWidths.deposit}
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
          width={columnWidths.balance}
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
