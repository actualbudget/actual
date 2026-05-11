import type { TransactionRowContentProps } from '../types';

import {
  AccountCell,
  AmountCell,
  BalanceCell,
  CategoryCell,
  DateCell,
  NotesCell,
  PayeeCell,
  StatusCell,
} from './cells';
import { RowExpansionCell } from './RowExpansionCell';

type RegularTransactionRowCellsProps = TransactionRowContentProps & {
  isExpanded: boolean;
  onToggleRowExpansion: () => void;
};

export function RegularTransactionRowCells({
  transaction,
  focusedField,
  selected,
  accounts,
  categoryGroups,
  payees,
  showCleared,
  showAccount,
  showBalances,
  showCategory,
  balance,
  hideFraction,
  dateFormat,
  account,
  payee,
  category,
  transferAccount,
  schedule,
  notesValue,
  _previewStatus,
  onEdit,
  onUpdate,
  onSelect,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onManagePayees,
  onOpenSplitModal,
  allowSplitTransaction,
  showSelection,
  isExpanded,
  onToggleRowExpansion,
  columnWidths,
}: RegularTransactionRowCellsProps) {
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
          showSplitOption={allowSplitTransaction}
          onEdit={onEdit}
          onUpdate={onUpdate}
          onOpenSplitModal={() => onOpenSplitModal(transaction.id)}
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
          onEdit={onEdit}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
