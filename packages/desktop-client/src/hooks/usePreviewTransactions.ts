import { useState } from 'react';

import {
  type ScheduleStatuses,
  useCachedSchedules,
} from 'loot-core/client/data-hooks/schedules';
import { send } from 'loot-core/platform/client/fetch';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import {
  type AccountEntity,
  type ScheduleEntity,
} from 'loot-core/types/models';

import { type TransactionEntity } from '../../../loot-core/src/types/models/transaction.d';

export type PreviewTransactionEntity = TransactionEntity & {
  _inverse?: boolean;
};

export function usePreviewTransactions({
  accountId,
}: {
  accountId?: AccountEntity['id'];
}): PreviewTransactionEntity[] {
  const scheduleData = useCachedSchedules();
  const [previousScheduleData, setPreviousScheduleData] =
    useState<ReturnType<typeof useCachedSchedules>>(scheduleData);
  const [previewTransactions, setPreviewTransactions] = useState<
    PreviewTransactionEntity[]
  >([]);

  if (scheduleData !== previousScheduleData) {
    setPreviousScheduleData(scheduleData);

    if (scheduleData) {
      // Kick off an async rules application
      const schedules =
        scheduleData.schedules.filter(s =>
          isForPreview(s, scheduleData.statuses),
        ) || [];

      const baseTrans = schedules.map(schedule => ({
        id: 'preview/' + schedule.id,
        payee: schedule._payee,
        account: schedule._account,
        amount: schedule._amount,
        date: schedule.next_date,
        schedule: schedule.id,
      }));

      Promise.all(
        baseTrans.map(transaction => send('rules-run', { transaction })),
      ).then(newTrans => {
        const withDefaults = newTrans.map(t => ({
          ...t,
          category: scheduleData.statuses.get(t.schedule),
          schedule: t.schedule,
          subtransactions: t.subtransactions?.map((st: TransactionEntity) => ({
            ...st,
            id: 'preview/' + st.id,
            schedule: t.schedule,
          })),
        }));
        setPreviewTransactions(
          ungroupTransactions(withDefaults).map(t => ({
            ...t,
            _inverse: accountId ? accountId !== t.account : false,
          })),
        );
      });
    }

    return previewTransactions;
  }

  return previewTransactions;
}

function isForPreview(schedule: ScheduleEntity, statuses: ScheduleStatuses) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    (status === 'due' || status === 'upcoming' || status === 'missed')
  );
}
