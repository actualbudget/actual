import { useMemo } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { q } from '@actual-app/core/shared/query';
import {
  extractScheduleConds,
  scheduleIsRecurring,
} from '@actual-app/core/shared/schedules';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { useContextMenuAction } from '#components/ContextMenu';
import type { ContextMenuAction } from '#components/ContextMenu';
import { useSchedules } from '#hooks/useSchedules';
import { useSelectedItems } from '#hooks/useSelected';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type TransactionRowContextMenuProps = {
  rowRef: RefObject<HTMLElement | null>;
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
};

export function useTransactionRowContextActions({
  rowRef,
  transaction,
  getTransaction,
  onDuplicate,
  onDelete,
  onLinkSchedule,
  onUnlinkSchedule,
  onCreateRule,
  onScheduleAction,
  onMakeAsNonSplitTransactions,
}: TransactionRowContextMenuProps) {
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

  const scheduleActions: ContextMenuAction[] = [
    {
      name: 'view-schedule',
      text: t('View Schedule'),
      onClick: onViewSchedule,
      hidden: selectedIds.length !== 1,
    },
    {
      name: 'post-transaction',
      text: t('Post transaction'),
      onClick: () => onScheduleAction('post-transaction', selectedIds),
    },
    {
      name: 'skip',
      text: t('Skip next scheduled date'),
      onClick: () => onScheduleAction('skip', selectedIds),
      hidden: !canBeSkipped,
    },
    {
      name: 'complete',
      text: t('Mark as completed'),
      onClick: () => onScheduleAction('complete', selectedIds),
      hidden: !canBeCompleted,
    },
  ];

  const transactionActions: ContextMenuAction[] = [
    {
      name: 'duplicate',
      text: t('Duplicate'),
      onClick: () => onDuplicate(selectedIds),
      hidden: ambiguousDuplication,
    },
    {
      name: 'delete',
      text: t('Delete'),
      onClick: () => onDelete(selectedIds),
    },
    {
      name: 'view-schedule',
      text: t('View Schedule'),
      onClick: onViewSchedule,
      hidden: !(selectedIds.length === 1 && linked),
    },
    {
      name: 'unlink-schedule',
      text: t('Unlink schedule'),
      onClick: () => onUnlinkSchedule(selectedIds),
      hidden: !linked,
    },
    {
      name: 'link-schedule',
      text: t('Link schedule'),
      onClick: () => onLinkSchedule(selectedIds),
      hidden: linked,
    },
    {
      name: 'create-rule',
      text: t('Create rule'),
      onClick: () => onCreateRule(selectedIds),
      hidden: linked,
    },
    {
      name: 'unsplit-transactions',
      text: t('Unsplit {{count}} transactions', {
        count: selectedIds.length,
      }),
      onClick: () => onMakeAsNonSplitTransactions(selectedIds),
      hidden: !canUnsplitTransactions,
    },
  ];

  useContextMenuAction(
    rowRef,
    ...(types.trans ? transactionActions : scheduleActions),
  );
}
