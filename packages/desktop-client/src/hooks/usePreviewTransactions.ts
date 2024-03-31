import { useMemo } from 'react';

import { useCachedSchedules } from 'loot-core/client/data-hooks/schedules';

export function usePreviewTransactions() {
  const scheduleData = useCachedSchedules();

  return useMemo(() => {
    if (!scheduleData) {
      return [];
    }

    const schedules =
      scheduleData.schedules?.filter(
        s =>
          !s.completed &&
          ['due', 'upcoming', 'missed'].includes(
            scheduleData.statuses?.get(s.id),
          ),
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
  }, [scheduleData]);
}
