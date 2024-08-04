import React, { useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { isPreviewId } from 'loot-core/shared/transactions';
import { validForTransfer } from 'loot-core/src/client/transfer';

import { useSelectedItems } from '../../hooks/useSelected';
import { Menu } from '../common/Menu';
import { SelectedItemsButton } from '../table';

export function SelectedTransactionsButton({
  account,
  getTransaction,
  onShow,
  onDuplicate,
  onDelete,
  onEdit,
  onUnlink,
  onCreateRule,
  onSetTransfer,
  onScheduleAction,
  showMakeTransfer,
  onMakeAsSplitTransaction,
  onMakeAsNonSplitTransactions,
}) {
  const dispatch = useDispatch();
  const selectedItems = useSelectedItems();
  const selectedIds = useMemo(() => [...selectedItems], [selectedItems]);

  const types = useMemo(() => {
    const items = selectedIds;
    return {
      preview: !!items.find(id => isPreviewId(id)),
      trans: !!items.find(id => !isPreviewId(id)),
    };
  }, [selectedIds]);

  const ambiguousDuplication = useMemo(() => {
    const transactions = selectedIds.map(id => getTransaction(id));

    return transactions.some(t => t && t.is_child);
  }, [selectedIds, getTransaction]);

  const linked = useMemo(() => {
    return (
      !types.preview &&
      selectedIds.every(id => {
        const t = getTransaction(id);
        return t && t.schedule;
      })
    );
  }, [types.preview, selectedIds, getTransaction]);

  const canBeTransfer = useMemo(() => {
    // only two selected
    if (selectedIds.length !== 2) {
      return false;
    }
    const fromTrans = getTransaction(selectedIds[0]);
    const toTrans = getTransaction(selectedIds[1]);

    // previously selected transactions aren't always present in current transaction list
    if (!fromTrans || !toTrans) {
      return false;
    }

    return validForTransfer(fromTrans, toTrans);
  }, [selectedIds, getTransaction]);

  const canMakeAsSplitTransaction = useMemo(() => {
    if (selectedIds.length <= 1 || types.preview) {
      return false;
    }

    const transactions = selectedIds.map(id => getTransaction(id));
    const [firstTransaction] = transactions;

    const areAllSameDateAndAccount = transactions.every(
      t =>
        t &&
        t.date === firstTransaction.date &&
        t.account === firstTransaction.account,
    );
    const areNoSplitTransactions = transactions.every(
      t => t && !t.is_parent && !t.is_child,
    );
    const areNoReconciledTransactions = transactions.every(
      t => t && !t.reconciled,
    );

    return (
      areAllSameDateAndAccount &&
      areNoSplitTransactions &&
      areNoReconciledTransactions
    );
  }, [selectedIds, types, getTransaction]);

  const canUnsplitTransactions = useMemo(() => {
    if (selectedIds.length === 0 || types.preview) {
      return false;
    }

    const transactions = selectedIds.map(id => getTransaction(id));

    const areNoReconciledTransactions = transactions.every(
      t => t && !t.reconciled,
    );
    const areAllSplitTransactions = transactions.every(
      t => t && (t.is_parent || t.is_child),
    );
    return areNoReconciledTransactions && areAllSplitTransactions;
  }, [selectedIds, types, getTransaction]);

  function onLinkSchedule() {
    dispatch(
      pushModal('schedule-link', {
        transactionIds: selectedIds,
        getTransaction,
        accountName: account?.name ?? '',
      }),
    );
  }

  function onViewSchedule() {
    const firstId = selectedIds[0];
    let scheduleId;
    if (isPreviewId(firstId)) {
      const parts = firstId.split('/');
      scheduleId = parts[1];
    } else {
      const trans = getTransaction(firstId);
      scheduleId = trans && trans.schedule;
    }

    if (scheduleId) {
      dispatch(pushModal('schedule-edit', { id: scheduleId }));
    }
  }

  const hotKeyOptions = {
    enabled: types.trans,
    scopes: ['app'],
  };
  useHotkeys('f', () => onShow(selectedIds), hotKeyOptions, [
    onShow,
    selectedIds,
  ]);
  useHotkeys('d', () => onDelete(selectedIds), hotKeyOptions, [
    onDelete,
    selectedIds,
  ]);
  useHotkeys('a', () => onEdit('account', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('p', () => onEdit('payee', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('n', () => onEdit('notes', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('c', () => onEdit('category', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('l', () => onEdit('cleared', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys(
    's',
    () => (!types.trans || linked ? onViewSchedule() : onLinkSchedule()),
    {
      scopes: ['app'],
    },
    [onLinkSchedule, onViewSchedule, linked, selectedIds],
  );

  return (
    <SelectedItemsButton
      name="transactions"
      items={[
        ...(!types.trans
          ? [
              { name: 'view-schedule', text: 'View schedule', key: 'S' },
              { name: 'post-transaction', text: 'Post transaction' },
              { name: 'skip', text: 'Skip scheduled date' },
            ]
          : [
              { name: 'show', text: 'Show', key: 'F' },
              {
                name: 'duplicate',
                text: 'Duplicate',
                disabled: ambiguousDuplication,
              },
              { name: 'delete', text: 'Delete', key: 'D' },
              ...(linked
                ? [
                    {
                      name: 'view-schedule',
                      text: 'View schedule',
                      key: 'S',
                      disabled: selectedIds.length > 1,
                    },
                    { name: 'unlink-schedule', text: 'Unlink schedule' },
                  ]
                : [
                    {
                      name: 'link-schedule',
                      text: 'Link schedule',
                      key: 'S',
                    },
                    {
                      name: 'create-rule',
                      text: 'Create rule',
                    },
                  ]),
              ...(showMakeTransfer
                ? [
                    {
                      name: 'set-transfer',
                      text: 'Make transfer',
                      disabled: !canBeTransfer,
                    },
                  ]
                : []),
              ...(canMakeAsSplitTransaction
                ? [
                    {
                      name: 'make-as-split-transaction',
                      text: 'Make as split transaction',
                    },
                  ]
                : []),
              ...(canUnsplitTransactions
                ? [
                    {
                      name: 'unsplit-transactions',
                      text:
                        'Unsplit transaction' +
                        (selectedIds.length > 1 ? 's' : ''),
                    },
                  ]
                : []),
              Menu.line,
              { type: Menu.label, name: 'Edit field' },
              { name: 'date', text: 'Date' },
              { name: 'account', text: 'Account', key: 'A' },
              { name: 'payee', text: 'Payee', key: 'P' },
              { name: 'notes', text: 'Notes', key: 'N' },
              { name: 'category', text: 'Category', key: 'C' },
              { name: 'amount', text: 'Amount' },
              { name: 'cleared', text: 'Cleared', key: 'L' },
            ]),
      ]}
      onSelect={name => {
        switch (name) {
          case 'show':
            onShow(selectedIds);
            break;
          case 'duplicate':
            onDuplicate(selectedIds);
            break;
          case 'delete':
            onDelete(selectedIds);
            break;
          case 'make-as-split-transaction':
            onMakeAsSplitTransaction(selectedIds);
            break;
          case 'unsplit-transactions':
            onMakeAsNonSplitTransactions(selectedIds);
            break;
          case 'post-transaction':
          case 'skip':
            onScheduleAction(name, selectedIds);
            break;
          case 'view-schedule':
            onViewSchedule();
            break;
          case 'link-schedule':
            onLinkSchedule();
            break;
          case 'unlink-schedule':
            onUnlink(selectedIds);
            break;
          case 'create-rule':
            onCreateRule(selectedIds);
            break;
          case 'set-transfer':
            onSetTransfer(selectedIds);
            break;
          default:
            onEdit(name, selectedIds);
        }
      }}
    />
  );
}
