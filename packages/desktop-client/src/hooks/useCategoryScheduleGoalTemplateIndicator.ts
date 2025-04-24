import { useMemo } from 'react';

import { type ScheduleStatusType } from 'loot-core/client/data-hooks/schedules';
import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type ScheduleEntity,
} from 'loot-core/types/models';

import { useCategoryScheduleGoalTemplates } from './useCategoryScheduleGoalTemplates';

type UseCategoryScheduleGoalTemplateProps = {
  category: CategoryEntity;
  month: string;
};

type UseCategoryScheduleGoalTemplateResult = {
  schedule: ScheduleEntity | null;
  scheduleStatus: ScheduleStatusType | null;
  isScheduleRecurring: boolean;
};

/**
 * We only display an indicator for one schedule at a time, so we
 * filter and then sort the schedules to show missed schedules first,
 * then due schedules, then upcoming schedules. This is to ensure that
 * the user sees the most important schedule first.
 */
export function useCategoryScheduleGoalTemplateIndicator({
  category,
  month,
}: UseCategoryScheduleGoalTemplateProps): UseCategoryScheduleGoalTemplateResult {
  const { schedules, statuses: scheduleStatuses } =
    useCategoryScheduleGoalTemplates({
      category,
    });

  return useMemo<UseCategoryScheduleGoalTemplateResult>(() => {
    const currentMonthSchedules = schedules
      .filter(schedule => {
        const status = scheduleStatuses.get(schedule.id);
        return status === 'upcoming' || status === 'due' || status === 'missed';
      })
      .filter(
        schedule => monthUtils.monthFromDate(schedule.next_date) === month,
      )
      .sort((a, b) => {
        // Display missed schedules first, then due, then upcoming.
        const aStatus = scheduleStatuses.get(a.id);
        const bStatus = scheduleStatuses.get(b.id);
        if (aStatus === 'missed' && bStatus !== 'missed') return -1;
        if (bStatus === 'missed' && aStatus !== 'missed') return 1;
        if (aStatus === 'due' && bStatus !== 'due') return -1;
        if (bStatus === 'due' && aStatus !== 'due') return 1;
        return 0;
      });

    const schedule = currentMonthSchedules[0] || null;
    const scheduleStatus =
      (schedule ? scheduleStatuses.get(schedule.id) : null) || null;

    return {
      schedule,
      scheduleStatus,
      isScheduleRecurring: !!schedule?._date?.frequency,
    };
  }, [month, scheduleStatuses, schedules]);
}
