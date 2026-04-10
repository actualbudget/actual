import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransactionRowProps } from 'packages/desktop-client/src/components/transactions/TransactionTable/types';
import {
  deserializeTransaction,
  serializeTransaction,
} from 'packages/desktop-client/src/components/transactions/TransactionTable/utils/transactionFormatters';

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

import { Row, SelectCell } from '@desktop-client/components/table';
import { useSelectedDispatch } from '@desktop-client/hooks/useSelected';

const ROW_HEIGHT = 32;
const EXPANDED_MIN_HEIGHT = 64;

export function TransactionRow({
  transaction,
  editing,
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
  isNew,
  isMatched,
  isExpanded,
  isSplitExpanded,
  rowHeight,
  dateFormat,
  onEdit,
  onSave,
  onDelete,
  onToggleSplit,
  onToggleRowExpansion,
  onSetRowHeight,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onNotesTagClick,
  onApplyRules,
  onManagePayees,
  showSelection,
}: TransactionRowProps) {
  const dispatchSelected = useSelectedDispatch();
  const [serialized, setSerialized] = useState(() =>
    serializeTransaction(transaction),
  );
  const [editingField, setEditingField] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const expandedContentRef = useRef<HTMLDivElement>(null);

  // Update serialized when transaction changes
  useEffect(() => {
    setSerialized(serializeTransaction(transaction));
  }, [transaction]);

  // Measure expanded content height
  useEffect(() => {
    if (isExpanded && expandedContentRef.current) {
      const height = expandedContentRef.current.scrollHeight;
      const totalHeight = ROW_HEIGHT + height;
      if (totalHeight !== rowHeight) {
        onSetRowHeight(transaction.id, totalHeight);
      }
    } else if (!isExpanded && rowHeight !== ROW_HEIGHT) {
      onSetRowHeight(transaction.id, ROW_HEIGHT);
    }
  }, [isExpanded, rowHeight, transaction.id, onSetRowHeight]);

  const account = useMemo(
    () => accounts.find(a => a.id === transaction.account),
    [accounts, transaction.account],
  );

  const payee = useMemo(
    () => payees.find(p => p.id === transaction.payee),
    [payees, transaction.payee],
  );

  const category = useMemo(() => {
    for (const group of categoryGroups) {
      const cat = group.categories?.find(c => c.id === transaction.category);
      if (cat) return cat;
    }
    return null;
  }, [categoryGroups, transaction.category]);

  const transferAccount = useMemo(() => {
    if (payee?.transfer_acct) {
      return accounts.find(a => a.id === payee.transfer_acct);
    }
    return null;
  }, [payee, accounts]);

  const handleEdit = useCallback(
    (id: string, field: string) => {
      setEditingField(field);
      onEdit(id, field);
    },
    [onEdit],
  );

  const handleUpdate = useCallback(
    async (field: string, value: unknown) => {
      const updated = { ...serialized, [field]: value };
      setSerialized(updated);

      const deserialized = deserializeTransaction(updated, transaction);
      const withRules = await onApplyRules(deserialized, field);
      onSave(withRules);
      setEditingField(null);
    },
    [serialized, transaction, onApplyRules, onSave],
  );

  const handleSelect = useCallback(() => {
    dispatchSelected({
      type: 'select',
      id: transaction.id,
      isRangeSelect: false,
    });
  }, [dispatchSelected, transaction.id]);

  const handleToggleExpansion = useCallback(() => {
    onToggleRowExpansion(transaction.id);
  }, [onToggleRowExpansion, transaction.id]);

  const isSplit = transaction.is_parent;
  const isChild = transaction.is_child;
  const isPreview = transaction.id?.startsWith('preview/');

  const rowStyle = {
    backgroundColor: selected
      ? theme.tableRowBackgroundHighlight
      : isNew
        ? theme.tableRowBackgroundHover
        : theme.tableBackground,
    ...(isNew && { fontWeight: 600 }),
    ...(isMatched && { color: theme.pageTextPositive }),
    ...(isChild && { paddingLeft: 20 }),
  };

  const currentHeight = isExpanded
    ? rowHeight || EXPANDED_MIN_HEIGHT
    : ROW_HEIGHT;

  return (
    <View style={{ height: currentHeight }}>
      <Row
        ref={rowRef}
        style={rowStyle}
        height={ROW_HEIGHT}
        data-transaction-id={transaction.id}
        data-testid="transaction-row"
      >
        {showSelection && (
          <SelectCell
            exposed
            focused={false}
            selected={selected}
            width={20}
            onSelect={handleSelect}
          />
        )}

        {!showSelection && (
          <View style={{ width: 20, flexShrink: 0 }}>
            {!isChild && (
              <button
                onClick={handleToggleExpansion}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                }}
                aria-label={isExpanded ? {t('Collapse row')} : {t('Expand row')}}
              >
                <SvgCheveronDown
                  style={{
                    width: 12,
                    height: 12,
                    color: theme.pageTextSubdued,
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
            )}
          </View>
        )}

        <DateCell
          id={transaction.id}
          date={serialized.date}
          dateFormat={dateFormat}
          focused={editingField === 'date'}
          exposed={editing && editingField === 'date'}
          isPreview={isPreview}
          onEdit={handleEdit}
          onUpdate={handleUpdate}
        />

        {showAccount && (
          <AccountCell
            id={transaction.id}
            account={account}
            accounts={accounts}
            focused={editingField === 'account'}
            exposed={editing && editingField === 'account'}
            isPreview={isPreview}
            onEdit={handleEdit}
            onUpdate={handleUpdate}
          />
        )}

        <PayeeCell
          id={transaction.id}
          payee={payee}
          transferAccount={transferAccount}
          schedule={null}
          payees={payees}
          focused={editingField === 'payee'}
          exposed={editing && editingField === 'payee'}
          isPreview={isPreview}
          onEdit={handleEdit}
          onUpdate={handleUpdate}
          onManagePayees={onManagePayees}
          onNavigateToTransferAccount={onNavigateToTransferAccount}
          onNavigateToSchedule={onNavigateToSchedule}
        />

        <NotesCell
          id={transaction.id}
          notes={transaction.notes}
          focused={editingField === 'notes'}
          exposed={editing && editingField === 'notes'}
          isPreview={isPreview}
          onEdit={handleEdit}
          onUpdate={handleUpdate}
        />

        {showCategory && (
          <CategoryCell
            id={transaction.id}
            category={category}
            categoryGroups={categoryGroups}
            focused={editingField === 'category'}
            exposed={editing && editingField === 'category'}
            isPreview={isPreview}
            isSplit={isSplit}
            onEdit={handleEdit}
            onUpdate={handleUpdate}
          />
        )}

        <AmountCell
          id={transaction.id}
          amount={transaction.amount}
          type="debit"
          focused={editingField === 'debit'}
          exposed={editing && editingField === 'debit'}
          hideFraction={hideFraction}
          isPreview={isPreview}
          onEdit={handleEdit}
          onUpdate={handleUpdate}
        />

        <AmountCell
          id={transaction.id}
          amount={transaction.amount}
          type="credit"
          focused={editingField === 'credit'}
          exposed={editing && editingField === 'credit'}
          hideFraction={hideFraction}
          isPreview={isPreview}
          onEdit={handleEdit}
          onUpdate={handleUpdate}
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
            status={transaction.cleared ? 'cleared' : null}
            focused={editingField === 'cleared'}
            selected={selected}
            isChild={isChild}
            isPreview={isPreview}
            onEdit={handleEdit}
            onUpdate={handleUpdate}
          />
        )}
      </Row>

      {isExpanded && (
        <View
          ref={expandedContentRef}
          style={{
            padding: '8px 20px',
            backgroundColor: theme.tableRowBackgroundHover,
            borderTop: `1px solid ${theme.tableBorder}`,
            overflow: 'auto',
          }}
        >
          <View style={{ fontSize: 13, color: theme.pageTextSubdued }}>
            <div>
              <strong>
                <Trans>Expanded Content</Trans>
              </strong>
            </div>
            <div style={{ marginTop: 8 }}>
              This is where additional transaction details can be displayed. The
              row height adjusts automatically based on content.
            </div>
            {transaction.notes && (
              <div style={{ marginTop: 8 }}>
                <strong>Full Notes:</strong> {transaction.notes}
              </div>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
