import { useMemo } from 'react';

import type { CategoryEntity, ScheduleEntity } from 'loot-core/types/models';

import { useCachedSchedules } from './useCachedSchedules';
import { useFeatureFlag } from './useFeatureFlag';
import { useScheduleStatus } from './useScheduleStatus';

import type { ScheduleStatusData } from '@desktop-client/schedules';

type ScheduleGoalDefinition = {
  type: 'schedule';
  name: ScheduleEntity['name'];
};

type UseCategoryScheduleGoalTemplatesProps = {
  category?: CategoryEntity | undefined;
};

type UseCategoryScheduleGoalTemplatesResult = ScheduleStatusData & {
  schedules: readonly ScheduleEntity[];
};

export function useCategoryScheduleGoalTemplates({
  category,
}: UseCategoryScheduleGoalTemplatesProps): UseCategoryScheduleGoalTemplatesResult {
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const { data: allSchedules = [] } = useCachedSchedules();
  const { data: { statusLookup = {}, statusLabelLookup = {} } = {} } =
    useScheduleStatus({ schedules: allSchedules });

  return useMemo(() => {
    if (!isGoalTemplatesEnabled || !category || !category.goal_def) {
      return {
        schedules: [],
        statusLookup: {},
        statusLabelLookup: {},
      };
    }

    let goalDefinitions: Record<string, unknown>[] = [];
    try {
      goalDefinitions = JSON.parse(category.goal_def);
    } catch (e) {
      console.error('Failed to parse category goal_def:', e);
      return {
        schedules: [],
        statusLookup: {},
        statusLabelLookup: {},
      };
    }

    const scheduleGoalDefinitions = goalDefinitions.filter(
      g => g.type === 'schedule',
    ) as ScheduleGoalDefinition[];

    if (!scheduleGoalDefinitions.length) {
      return {
        schedules: [],
        statusLookup: {},
        statusLabelLookup: {},
      };
    }

    const schedules = allSchedules.filter(s =>
      scheduleGoalDefinitions.some(g => g.name === s.name),
    );

    const scheduleIds = new Set(schedules.map(s => s.id));

    const filteredStatusLookup = Object.fromEntries(
      Object.entries(statusLookup).filter(([id]) => scheduleIds.has(id)),
    );
    const filteredStatusLabelLookup = Object.fromEntries(
      Object.entries(statusLabelLookup).filter(([id]) => scheduleIds.has(id)),
    );

    return {
      schedules,
      statusLookup: filteredStatusLookup,
      statusLabelLookup: filteredStatusLabelLookup,
    };
  }, [
    allSchedules,
    statusLabelLookup,
    statusLookup,
    category,
    isGoalTemplatesEnabled,
  ]);
}
