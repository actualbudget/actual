import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { isTemporaryId } from '@actual-app/core/shared/transactions';

import { Row } from '#components/table';
import { useCachedSchedules } from '#hooks/useCachedSchedules';
import { useSelectedDispatch } from '#hooks/useSelected';
import type { TransactionRowProps } from '../types';
import {
  deserializeTransaction,
  serializeTransaction,
} from '../utils/transactionFormatters';

import { TransactionRowCells } from './TransactionRowCells';

const ROW_HEIGHT = 32;
const EXPANDED_MIN_HEIGHT = 64;

export function TransactionRow({
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
  isNew,
  isMatched,
  isExpanded,
  isSplitExpanded,
  rowHeight,
  dateFormat,
  columnWidths,
  onEdit,
  onSave,
  onToggleSplit,
  onToggleRowExpansion,
  onSetRowHeight,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onApplyRules,
  onManagePayees,
  onSplit,
  allowSplitTransaction,
  showSelection,
}: TransactionRowProps) {
  const { schedules = [] } = useCachedSchedules();
  const dispatchSelected = useSelectedDispatch();
  const [serialized, setSerialized] = useState(() =>
    serializeTransaction(transaction),
  );
  const rowRef = useRef<HTMLDivElement>(null);
  const expandedContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSerialized(serializeTransaction(transaction));
  }, [transaction]);

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

  const handleUpdate = useCallback(
    async (field: string, value: unknown) => {
      const updated = { ...serialized, [field]: value };
      setSerialized(updated);

      const deserialized = deserializeTransaction(updated, transaction);
      const withRules = await onApplyRules(deserialized, field);
      onSave(withRules);
    },
    [serialized, transaction, onApplyRules, onSave],
  );

  const isPreview = transaction.id?.startsWith('preview/');
  const schedule = transaction.schedule
    ? schedules.find(item => item.id === transaction.schedule)
    : null;
  const previewStatus = transaction.forceUpcoming
    ? 'upcoming'
    : transaction.category;
  const notesValue =
    transaction.notes ?? (isPreview ? schedule?.name : null) ?? undefined;

  const handleSelect = useCallback(() => {
    dispatchSelected({
      type: 'select',
      id: transaction.id,
      isRangeSelect: false,
    });
  }, [dispatchSelected, transaction.id]);

  const rowStyle = {
    backgroundColor: selected
      ? theme.tableRowBackgroundHighlight
      : isNew
        ? theme.tableRowBackgroundHover
        : theme.tableBackground,
    ...(isNew && { fontWeight: 600 }),
    ...(isMatched && { color: theme.pageTextPositive }),
    ...(isPreview && {
      color: theme.tableTextInactive,
      fontStyle: 'italic',
    }),
  };

  const currentHeight = isExpanded
    ? rowHeight || EXPANDED_MIN_HEIGHT
    : ROW_HEIGHT;

  const contentProps = {
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
    columnWidths,
    isPreview,
    isSplitExpanded,
    account,
    payee,
    category,
    transferAccount,
    schedule,
    notesValue,
    previewStatus,
    onEdit,
    onUpdate: handleUpdate,
    onSelect: handleSelect,
    onToggleSplit,
    onNavigateToTransferAccount,
    onNavigateToSchedule,
    onManagePayees,
    onSplit,
    allowSplitTransaction,
    showSelection,
  };

  return (
    <View
      style={{ height: currentHeight }}
      data-testid={
        isTemporaryId(transaction.id) ? 'new-transaction' : undefined
      }
    >
      <Row
        ref={rowRef}
        style={rowStyle}
        height={ROW_HEIGHT}
        data-transaction-id={transaction.id}
        data-testid="transaction-row"
      >
        <TransactionRowCells
          {...contentProps}
          isExpanded={isExpanded}
          onToggleRowExpansion={() => onToggleRowExpansion(transaction.id)}
        />
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
