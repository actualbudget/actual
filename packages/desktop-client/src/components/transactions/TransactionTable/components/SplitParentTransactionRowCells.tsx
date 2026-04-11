import type { TransactionRowContentProps } from '../types';

import {
  AccountCell,
  AmountCell,
  BalanceCell,
  DateCell,
  NotesCell,
  PayeeCell,
  SplitCategoryCell,
  StatusCell,
} from './cells';
import { RowExpansionCell } from './RowExpansionCell';

type SplitParentTransactionRowCellsProps = TransactionRowContentProps & {
  isExpanded: boolean;
  onToggleRowExpansion: () => void;
};

export function SplitParentTransactionRowCells({
  transaction,
  focusedField,
  selected,
  accounts,
  payees,
  showCleared,
  showAccount,
  showBalances,
  showCategory,
  balance,
  hideFraction,
  dateFormat,
  isPreview,
  isSplitExpanded,
  account,
  payee,
  transferAccount,
  schedule,
  notesValue,
  onEdit,
  onUpdate,
  onSelect,
  onToggleSplit,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onManagePayees,
  showSelection,
  isExpanded,
  onToggleRowExpansion,
  columnWidths,
}: SplitParentTransactionRowCellsProps) {
  return (
    <>
      <RowExpansionCell
        id={transaction.id}
        focused={focusedField === 'select'}
        selected={selected}
        showSelection={showSelection}
        isExpanded={isExpanded}
        onSelect={onSelect}
        onEdit={onEdit}
        onToggleExpansion={onToggleRowExpansion}
      />

      <DateCell
        id={transaction.id}
        date={transaction.date}
        dateFormat={dateFormat}
        width={columnWidths.date}
        focused={focusedField === 'date'}
        exposed={focusedField === 'date'}
        isPreview={isPreview}
        onEdit={onEdit}
        onUpdate={onUpdate}
      />

      {showAccount && (
        <AccountCell
          id={transaction.id}
          account={account}
          accounts={accounts}
          width={columnWidths.account}
          focused={focusedField === 'account'}
          exposed={focusedField === 'account'}
          isPreview={isPreview}
          onEdit={onEdit}
          onUpdate={onUpdate}
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
        <SplitCategoryCell
          id={transaction.id}
          width={columnWidths.category}
          focused={focusedField === 'category'}
          isPreview={isPreview}
          isExpanded={isSplitExpanded}
          onEdit={onEdit}
          onToggleSplit={onToggleSplit}
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
          balance={balance}
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
          isPreview={isPreview}
          onEdit={onEdit}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
