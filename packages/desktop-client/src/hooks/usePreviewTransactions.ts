import { useState } from 'react';

import {
  type ScheduleStatuses,
  useCachedSchedules,
} from 'loot-core/client/data-hooks/schedules';
import { send } from 'loot-core/platform/client/fetch';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import {
  type TransactionEntity,
  type ScheduleEntity,
} from 'loot-core/types/models';

import { usePrevious } from './usePrevious';

/**
 * @deprecated Please use `usePreviewTransactions` hook from `loot-core/client/data-hooks/transactions` instead.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function usePreviewTransactions(
  collapseTransactions?: (ids: string[]) => void,
) {
  const [previewTransactions, setPreviewTransactions] = useState<
    TransactionEntity[]
  >([]);

  const scheduleData = useCachedSchedules();
  const previousScheduleData = usePrevious(scheduleData);

  if (scheduleData.isLoading) {
    return [];
  }

  if (scheduleData && scheduleData !== previousScheduleData) {
    // Kick off an async rules application
    const schedules = scheduleData.schedules.filter(s =>
      isForPreview(s, scheduleData.statuses),
    );

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
      setPreviewTransactions(ungroupTransactions(withDefaults));
      if (collapseTransactions) {
        collapseTransactions(withDefaults.map(t => t.id));
      }
    });
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
