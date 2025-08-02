import React, { useMemo, type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { q } from 'loot-core/shared/query';
import {
  scheduleIsRecurring,
  extractScheduleConds,
} from 'loot-core/shared/schedules';
import { isPreviewId } from 'loot-core/shared/transactions';
import { type TransactionEntity } from 'loot-core/types/models';

import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { useSelectedItems } from '@desktop-client/hooks/useSelected';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  transaction: TransactionEntity;
  getTransaction: (id: string) => TransactionEntity | undefined;
  onDuplicate: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onLinkSchedule: (ids: string[]) => void;
  onUnlinkSchedule: (ids: string[]) => void;
  onCreateRule: (ids: string[]) => void;
  onScheduleAction: (
    name: 'skip' | 'post-transaction' | 'post-transaction-today' | 'complete',
    ids: TransactionEntity['id'][],
  ) => void;
  onMakeAsNonSplitTransactions: (ids: string[]) => void;
  closeMenu: () => void;
};

export function TransactionMenu({
  transaction,
  getTransaction,
  onDuplicate,
  onDelete,
  onLinkSchedule,
  onUnlinkSchedule,
  onCreateRule,
  onScheduleAction,
  onMakeAsNonSplitTransactions,
  closeMenu,
  ...props
}: BalanceMenuProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selectedItems = useSelectedItems();

  const selectedIds = useMemo(() => {
    const ids =
      selectedItems && selectedItems.size > 0
        ? selectedItems
        : [transaction.id];
    return Array.from(new Set(ids));
  }, [transaction, selectedItems]);

  const scheduleIds = useMemo(() => {
    return selectedIds
      .filter(id => isPreviewId(id))
      .map(id => id.split('/')[1]);
  }, [selectedIds]);

  const scheduleQuery = useMemo(() => {
    return q('schedules')
      .filter({ id: { $oneof: scheduleIds } })
      .select('*');
  }, [scheduleIds]);

  const { schedules: selectedSchedules } = useSchedules({
    query: scheduleQuery,
  });

  const types = useMemo(() => {
    const items = selectedIds;
    return {
      preview: !!items.find(id => isPreviewId(id)),
      trans: !!items.find(id => !isPreviewId(id)),
    };
  }, [selectedIds]);

  const ambiguousDuplication = useMemo(() => {
    const transactions = selectedIds.map(id => getTransaction(id));

    return transactions.some(tx => tx && tx.is_child);
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

  const canBeSkipped = useMemo(() => {
    const recurringSchedules = selectedSchedules.filter(s => {
      const { date: dateCond } = extractScheduleConds(s._conditions);
      return scheduleIsRecurring(dateCond);
    });

    return recurringSchedules.length === selectedSchedules.length;
  }, [selectedSchedules]);

  const canBeCompleted = useMemo(() => {
    const singleSchedules = selectedSchedules.filter(s => {
      const { date: dateCond } = extractScheduleConds(s._conditions);
      return !scheduleIsRecurring(dateCond);
    });

    return singleSchedules.length === selectedSchedules.length;
  }, [selectedSchedules]);

  const canUnsplitTransactions = useMemo(() => {
    if (selectedIds.length === 0 || types.preview) {
      return false;
    }

    const transactions = selectedIds.map(id => getTransaction(id));

    const areNoReconciledTransactions = transactions.every(
      tx => tx && !tx.reconciled,
    );
    const areAllSplitTransactions = transactions.every(
      tx => tx && (tx.is_parent || tx.is_child),
    );
    return areNoReconciledTransactions && areAllSplitTransactions;
  }, [selectedIds, types, getTransaction]);

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
      dispatch(
        pushModal({
          modal: { name: 'schedule-edit', options: { id: scheduleId } },
        }),
      );
    }
  }

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'duplicate':
            onDuplicate(selectedIds);
            break;
          case 'delete':
            onDelete(selectedIds);
            break;
          case 'unsplit-transactions':
            onMakeAsNonSplitTransactions(selectedIds);
            break;
          case 'post-transaction':
          case 'post-transaction-today':
          case 'skip':
          case 'complete':
            onScheduleAction(name, selectedIds);
            break;
          case 'view-schedule':
            onViewSchedule();
            break;
          case 'link-schedule':
            onLinkSchedule(selectedIds);
            break;
          case 'unlink-schedule':
            onUnlinkSchedule(selectedIds);
            break;
          case 'create-rule':
            onCreateRule(selectedIds);
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
        closeMenu();
      }}
      items={[
        ...(!types.trans
          ? [
              ...(selectedIds.length === 1
                ? [{ name: 'view-schedule', text: t('View schedule') }]
                : []),
              { name: 'post-transaction', text: t('Post transaction') },
              {
                name: 'post-transaction-today',
                text: t('Post transaction today'),
              },
              ...(canBeSkipped
                ? [{ name: 'skip', text: t('Skip next scheduled date') }]
                : []),
              ...(canBeCompleted
                ? [{ name: 'complete', text: t('Mark as completed') }]
                : []),
            ]
          : [
              ...(ambiguousDuplication
                ? []
                : [{ name: 'duplicate', text: t('Duplicate') }]),
              { name: 'delete', text: t('Delete') },
              ...(linked
                ? [
                    ...(selectedIds.length === 1
                      ? [{ name: 'view-schedule', text: t('View schedule') }]
                      : []),
                    { name: 'unlink-schedule', text: t('Unlink schedule') },
                  ]
                : [
                    {
                      name: 'link-schedule',
                      text: t('Link schedule'),
                    },
                    {
                      name: 'create-rule',
                      text: t('Create rule'),
                    },
                  ]),
              ...(canUnsplitTransactions
                ? [
                    {
                      name: 'unsplit-transactions',
                      text: t('Unsplit {{count}} transactions', {
                        count: selectedIds.length,
                      }),
                    },
                  ]
                : []),
            ]),
      ]}
    />
  );
}
