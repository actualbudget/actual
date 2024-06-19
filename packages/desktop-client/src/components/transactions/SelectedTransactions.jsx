import React, { useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { isPreviewId } from 'loot-core/shared/transactions';
import { validForTransfer } from 'loot-core/src/client/transfer';

import { useSelectedItems } from '../../hooks/useSelected';
import { Menu } from '../common/Menu';
import { SelectedItemsButton } from '../table';

export function SelectedTransactionsButton({
  getTransaction,
  onShow,
  onDuplicate,
  onDelete,
  onEdit,
  onUnlink,
  onCreateRule,
  onSetTransfer,
  onScheduleAction,
  pushModal,
}) {
  const selectedItems = useSelectedItems();

  const types = useMemo(() => {
    const items = [...selectedItems];
    return {
      preview: !!items.find(id => isPreviewId(id)),
      trans: !!items.find(id => !isPreviewId(id)),
    };
  }, [selectedItems]);

  const ambiguousDuplication = useMemo(() => {
    const transactions = [...selectedItems].map(id => getTransaction(id));

    return transactions.some(t => t && t.is_child);
  }, [selectedItems]);

  const linked = useMemo(() => {
    return (
      !types.preview &&
      [...selectedItems].every(id => {
        const t = getTransaction(id);
        return t && t.schedule;
      })
    );
  }, [types.preview, selectedItems, getTransaction]);

  const canBeTransfer = useMemo(() => {
    // only two selected
    if (selectedItems.size !== 2) {
      return false;
    }
    const transactions = [...selectedItems];
    const fromTrans = getTransaction(transactions[0]);
    const toTrans = getTransaction(transactions[1]);

    // previously selected transactions aren't always present in current transaction list
    if (!fromTrans || !toTrans) {
      return false;
    }

    return validForTransfer(fromTrans, toTrans);
  }, [selectedItems, getTransaction]);

  const hotKeyOptions = {
    enabled: types.trans,
    scopes: ['app'],
  };
  useHotkeys('f', () => onShow([...selectedItems]), hotKeyOptions, [
    onShow,
    selectedItems,
  ]);
  useHotkeys('d', () => onDelete([...selectedItems]), hotKeyOptions, [
    onDelete,
    selectedItems,
  ]);
  useHotkeys('a', () => onEdit('account', [...selectedItems]), hotKeyOptions, [
    onEdit,
    selectedItems,
  ]);
  useHotkeys('p', () => onEdit('payee', [...selectedItems]), hotKeyOptions, [
    onEdit,
    selectedItems,
  ]);
  useHotkeys('n', () => onEdit('notes', [...selectedItems]), hotKeyOptions, [
    onEdit,
    selectedItems,
  ]);
  useHotkeys('c', () => onEdit('category', [...selectedItems]), hotKeyOptions, [
    onEdit,
    selectedItems,
  ]);
  useHotkeys('l', () => onEdit('cleared', [...selectedItems]), hotKeyOptions, [
    onEdit,
    selectedItems,
  ]);

  return (
    <SelectedItemsButton
      name="transactions"
      items={[
        ...(!types.trans
          ? [
              { name: 'view-schedule', text: 'View schedule' },
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
                      disabled: selectedItems.size > 1,
                    },
                    { name: 'unlink-schedule', text: 'Unlink schedule' },
                  ]
                : [
                    {
                      name: 'link-schedule',
                      text: 'Link schedule',
                    },
                    {
                      name: 'create-rule',
                      text: 'Create rule',
                    },
                  ]),
              {
                name: 'set-transfer',
                text: 'Make transfer',
                disabled: !canBeTransfer,
              },
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
            onShow([...selectedItems]);
            break;
          case 'duplicate':
            onDuplicate([...selectedItems]);
            break;
          case 'delete':
            onDelete([...selectedItems]);
            break;
          case 'post-transaction':
          case 'skip':
            onScheduleAction(name, selectedItems);
            break;
          case 'view-schedule':
            const firstId = [...selectedItems][0];
            let scheduleId;
            if (isPreviewId(firstId)) {
              const parts = firstId.split('/');
              scheduleId = parts[1];
            } else {
              const trans = getTransaction(firstId);
              scheduleId = trans && trans.schedule;
            }

            if (scheduleId) {
              pushModal('schedule-edit', { id: scheduleId });
            }
            break;
          case 'link-schedule':
            pushModal('schedule-link', {
              transactionIds: [...selectedItems],
              getTransaction,
              pushModal,
            });
            break;
          case 'unlink-schedule':
            onUnlink([...selectedItems]);
            break;
          case 'create-rule':
            onCreateRule([...selectedItems]);
            break;
          case 'set-transfer':
            onSetTransfer([...selectedItems]);
            break;
          default:
            onEdit(name, [...selectedItems]);
        }
      }}
    />
  );
}
