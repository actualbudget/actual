import React, { useMemo, type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { pushModal } from 'loot-core/client/modals/modalsSlice';
import { q } from 'loot-core/shared/query';
import {
  scheduleIsRecurring,
  extractScheduleConds,
} from 'loot-core/shared/schedules';
import { isPreviewId } from 'loot-core/shared/transactions';
import { type TransactionEntity } from 'loot-core/types/models';

import { useDispatch } from '../../redux';

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  transaction: TransactionEntity;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onLinkSchedule: (id: string) => void;
  onUnlinkSchedule: (id: string) => void;
  onCreateRule: (id: string) => void;
  onScheduleAction: (action: string, id: string) => void;
  onMakeAsNonSplitTransactions: (id: string) => void;
  closeMenu: () => void;
};

export function TransactionMenu({
  transaction,
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

  const isPreview = isPreviewId(transaction.id);
  const linked = !!transaction.schedule;
  const canUnsplitTransactions =
    !transaction.reconciled && (transaction.is_parent || transaction.is_child);

  const scheduleId = isPreview ? transaction.id?.split('/')?.[1] : null;
  const schedulesQuery = useMemo(
    () => q('schedules').filter({ id: scheduleId }).select('*'),
    [scheduleId],
  );
  const { isLoading: isSchedulesLoading, schedules } = useSchedules({
    query: schedulesQuery,
  });

  if (isSchedulesLoading) {
    return null;
  }

  let canBeSkipped = false;
  let canBeCompleted = false;
  if (isPreview) {
    const schedule = schedules?.[0];
    const { date: dateCond } = extractScheduleConds(schedule._conditions);

    canBeSkipped = scheduleIsRecurring(dateCond);
    canBeCompleted = !scheduleIsRecurring(dateCond);
  }

  function onViewSchedule() {
    const firstId = transaction.id;
    let scheduleId;
    if (isPreviewId(firstId)) {
      const parts = firstId.split('/');
      scheduleId = parts[1];
    } else {
      scheduleId = transaction.schedule;
    }

    if (scheduleId) {
      dispatch(
        pushModal({ name: 'schedule-edit', options: { id: scheduleId } }),
      );
    }
  }

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'duplicate':
            onDuplicate(transaction.id);
            break;
          case 'delete':
            onDelete(transaction.id);
            break;
          case 'unsplit-transactions':
            onMakeAsNonSplitTransactions(transaction.id);
            break;
          case 'post-transaction':
          case 'skip':
          case 'complete':
            onScheduleAction(name, transaction.id);
            break;
          case 'view-schedule':
            onViewSchedule();
            break;
          case 'link-schedule':
            onLinkSchedule(transaction.id);
            break;
          case 'unlink-schedule':
            onUnlinkSchedule(transaction.id);
            break;
          case 'create-rule':
            onCreateRule(transaction.id);
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
        closeMenu();
      }}
      items={
        isPreview
          ? [
              { name: 'view-schedule', text: t('View schedule') },
              { name: 'post-transaction', text: t('Post transaction today') },
              ...(canBeSkipped
                ? [{ name: 'skip', text: t('Skip next scheduled date') }]
                : []),
              ...(canBeCompleted
                ? [{ name: 'complete', text: t('Mark as completed') }]
                : []),
            ]
          : [
              {
                name: 'duplicate',
                text: t('Duplicate'),
              },
              { name: 'delete', text: t('Delete') },
              ...(linked
                ? [
                    {
                      name: 'view-schedule',
                      text: t('View schedule'),
                    },
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
                      text: t('Unsplit transaction'),
                    },
                  ]
                : []),
            ]
      }
    />
  );
}
