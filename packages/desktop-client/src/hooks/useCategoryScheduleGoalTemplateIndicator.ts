import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Locale } from 'date-fns';
import type { TFunction } from 'i18next';

import * as monthUtils from 'loot-core/shared/months';
import { getUpcomingDays } from 'loot-core/shared/schedules';
import type { ScheduleStatusType } from 'loot-core/shared/schedules';
import type { CategoryEntity, ScheduleEntity } from 'loot-core/types/models';

import { useCategoryScheduleGoalTemplates } from './useCategoryScheduleGoalTemplates';
import { useLocale } from './useLocale';
import { useSyncedPref } from './useSyncedPref';

type UseCategoryScheduleGoalTemplateProps = {
  category: CategoryEntity;
  month: string;
};

type UseCategoryScheduleGoalTemplateResult = {
  schedule: ScheduleEntity | null;
  scheduleStatus: ScheduleStatusType | null;
  isScheduleRecurring: boolean;
  description: string;
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
  const { t } = useTranslation();
  const locale = useLocale();

  const [upcomingScheduledTransactionLength] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );
  const upcomingDays = getUpcomingDays(upcomingScheduledTransactionLength);
  const { schedules, statuses: scheduleStatuses } =
    useCategoryScheduleGoalTemplates({
      category,
    });

  return useMemo<UseCategoryScheduleGoalTemplateResult>(() => {
    const schedulesToDisplay = schedules
      .filter(schedule => {
        const status = scheduleStatuses.get(schedule.id);
        return status === 'upcoming' || status === 'due' || status === 'missed';
      })
      .filter(schedule => {
        if (monthUtils.monthFromDate(schedule.next_date) === month) {
          return true;
        }

        const indicatorStartDate = monthUtils.subDays(
          schedule.next_date,
          upcomingDays,
        );
        return monthUtils.monthFromDate(indicatorStartDate) === month;
      })
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

    const description = schedulesToDisplay
      .map(s => {
        return getScheduleStatusDescription({
          t,
          schedule: s,
          scheduleStatus: scheduleStatuses.get(s.id),
          locale,
        });
      })
      .join('\n');

    const schedule = schedulesToDisplay[0] || null;
    const scheduleStatus =
      (schedule ? scheduleStatuses.get(schedule.id) : null) || null;

    return {
      schedule,
      scheduleStatus,
      isScheduleRecurring: !!(
        typeof schedule?._date === 'object' && schedule?._date?.frequency
      ),
      description,
    };
  }, [locale, month, scheduleStatuses, schedules, t, upcomingDays]);
}

function getScheduleStatusDescription({
  t,
  schedule,
  scheduleStatus,
  locale,
}: {
  t: TFunction;
  schedule?: ScheduleEntity;
  scheduleStatus?: ScheduleStatusType;
  locale?: Locale;
}) {
  if (!schedule || !scheduleStatus) {
    return '';
  }

  const isToday = monthUtils.isCurrentDay(schedule.next_date);
  const distanceFromNow = monthUtils.formatDistance(
    schedule.next_date,
    monthUtils.currentDay(),
    locale,
    {
      addSuffix: true,
    },
  );
  const formattedDate = monthUtils.format(schedule.next_date, 'MMMM d', locale);
  switch (scheduleStatus) {
    case 'missed':
      return t(
        'Missed {{scheduleName}} due {{distanceFromNow}} ({{formattedDate}})',
        {
          scheduleName: schedule.name,
          distanceFromNow,
          formattedDate,
        },
      );
    case 'due':
    case 'upcoming':
      return t(
        '{{scheduleName}} is due {{distanceFromNow}} ({{formattedDate}})',
        {
          scheduleName: schedule.name,
          distanceFromNow: isToday ? t('today') : distanceFromNow,
          formattedDate,
        },
      );
    default:
      throw new Error(
        `Unsupported schedule status for tooltip: ${scheduleStatus}`,
      );
  }
}
