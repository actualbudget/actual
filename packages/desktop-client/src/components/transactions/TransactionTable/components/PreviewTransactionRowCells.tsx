import type { StatusTypes } from '#components/schedules/StatusBadge';
import type { TransactionRowContentProps } from '../types';

import {
  AccountCell,
  AmountCell,
  BalanceCell,
  DateCell,
  NotesCell,
  PayeeCell,
  PreviewCategoryCell,
  StatusCell,
} from './cells';
import { RowExpansionCell } from './RowExpansionCell';

type PreviewTransactionRowCellsProps = TransactionRowContentProps & {
  isExpanded: boolean;
  onToggleRowExpansion: () => void;
};

export function PreviewTransactionRowCells({
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
  account,
  payee,
  transferAccount,
  schedule,
  notesValue,
  previewStatus,
  onEdit,
  onUpdate,
  onSelect,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onManagePayees,
  showSelection,
  isExpanded,
  onToggleRowExpansion,
  columnWidths,
}: PreviewTransactionRowCellsProps) {
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
        isPreview
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
          isPreview
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
        isPreview
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
        isPreview
        onEdit={onEdit}
        onUpdate={onUpdate}
      />

      {showCategory && (
        <PreviewCategoryCell
          previewStatus={previewStatus}
          selected={selected}
          width={columnWidths.category}
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
        isPreview
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
        isPreview
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
          status={previewStatus as StatusTypes}
          focused={focusedField === 'cleared'}
          selected={selected}
          isPreview
          onEdit={onEdit}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
