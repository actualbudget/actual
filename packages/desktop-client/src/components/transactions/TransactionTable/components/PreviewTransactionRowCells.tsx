import type { StatusTypes } from '@desktop-client/components/schedules/StatusBadge';
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
        />
      )}

      <AmountCell
        id={transaction.id}
        amount={transaction.amount}
        type="debit"
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
