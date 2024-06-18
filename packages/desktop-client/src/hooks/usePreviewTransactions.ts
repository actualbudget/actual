import { useMemo } from 'react';

import {
  type ScheduleStatuses,
  useCachedSchedules,
} from 'loot-core/client/data-hooks/schedules';
import { type ScheduleEntity } from 'loot-core/types/models';

export function usePreviewTransactions() {
  const scheduleData = useCachedSchedules();

  return useMemo(() => {
    if (!scheduleData) {
      return [];
    }

    const schedules =
      scheduleData.schedules.filter(s =>
        isForPreview(s, scheduleData.statuses),
      ) || [];

    return schedules.map(schedule => ({
      id: 'preview/' + schedule.id,
      payee: schedule._payee,
      account: schedule._account,
      amount: schedule._amount,
      date: schedule.next_date,
      notes: scheduleData.statuses.get(schedule.id),
      schedule: schedule.id,
    }));
  });
}

function isForPreview(schedule: ScheduleEntity, statuses: ScheduleStatuses) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    (status === 'due' || status === 'upcoming' || status === 'missed')
  );
}
