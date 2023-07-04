import React, { useMemo } from 'react';

import { useSelectedItems } from '../../hooks/useSelected';
import { usePushModal } from '../../util/router-tools';
import { Menu } from '../common';
import { SelectedItemsButton } from '../table';

import { isPreviewId } from './TransactionsTable';

export function SelectedTransactionsButton({
  getTransaction,
  onShow,
  onDuplicate,
  onDelete,
  onEdit,
  onUnlink,
  onCreateRule,
  onScheduleAction,
}) {
  let pushModal = usePushModal();
  let selectedItems = useSelectedItems();

  let types = useMemo(() => {
    let items = [...selectedItems];
    return {
      preview: !!items.find(id => isPreviewId(id)),
      trans: !!items.find(id => !isPreviewId(id)),
    };
  }, [selectedItems]);

  let ambiguousDuplication = useMemo(() => {
    let transactions = [...selectedItems].map(id => getTransaction(id));

    return transactions.some(t => t && t.is_child);
  }, [selectedItems]);

  let linked = useMemo(() => {
    return (
      !types.preview &&
      [...selectedItems].every(id => {
        let t = getTransaction(id);
        return t && t.schedule;
      })
    );
  }, [types.preview, selectedItems, getTransaction]);

  return (
    <SelectedItemsButton
      name="transactions"
      keyHandlers={
        types.trans && {
          f: () => onShow([...selectedItems]),
          d: () => onDelete([...selectedItems]),
          a: () => onEdit('account', [...selectedItems]),
          p: () => onEdit('payee', [...selectedItems]),
          n: () => onEdit('notes', [...selectedItems]),
          c: () => onEdit('category', [...selectedItems]),
          l: () => onEdit('cleared', [...selectedItems]),
        }
      }
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
            let firstId = [...selectedItems][0];
            let scheduleId;
            if (isPreviewId(firstId)) {
              let parts = firstId.split('/');
              scheduleId = parts[1];
            } else {
              let trans = getTransaction(firstId);
              scheduleId = trans && trans.schedule;
            }

            if (scheduleId) {
              pushModal(`/schedule/edit/${scheduleId}`);
            }
            break;
          case 'link-schedule':
            pushModal('/schedule/link', {
              transactionIds: [...selectedItems],
            });
            break;
          case 'unlink-schedule':
            onUnlink([...selectedItems]);
            break;
          case 'create-rule':
            onCreateRule([...selectedItems]);
            break;
          default:
            onEdit(name, [...selectedItems]);
        }
      }}
    ></SelectedItemsButton>
  );
}
