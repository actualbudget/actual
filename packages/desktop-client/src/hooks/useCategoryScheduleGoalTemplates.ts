import { useMemo } from 'react';

import {
  type ScheduleEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { useCachedSchedules } from './useCachedSchedules';
import { useFeatureFlag } from './useFeatureFlag';
import {
  type ScheduleStatuses,
  type ScheduleStatusLabels,
} from './useSchedules';

type ScheduleGoalDefinition = {
  type: 'schedule';
  name: ScheduleEntity['name'];
};

type UseCategoryScheduleGoalTemplatesProps = {
  category?: CategoryEntity | undefined;
};

type UseCategoryScheduleGoalTemplatesResult = {
  schedules: ScheduleEntity[];
  statuses: ScheduleStatuses;
  statusLabels: ScheduleStatusLabels;
};

export function useCategoryScheduleGoalTemplates({
  category,
}: UseCategoryScheduleGoalTemplatesProps): UseCategoryScheduleGoalTemplatesResult {
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const {
    schedules: allSchedules,
    statuses: allStatuses,
    statusLabels: allStatusLabels,
  } = useCachedSchedules();

  return useMemo(() => {
    if (!isGoalTemplatesEnabled || !category || !category.goal_def) {
      return {
        schedules: [],
        statuses: new Map(),
        statusLabels: new Map(),
      };
    }

    let goalDefinitions: Record<string, unknown>[] = [];
    try {
      goalDefinitions = JSON.parse(category.goal_def);
    } catch (e) {
      console.error('Failed to parse category goal_def:', e);
      return {
        schedules: [],
        statuses: new Map(),
        statusLabels: new Map(),
      };
    }

    const scheduleGoalDefinitions = goalDefinitions.filter(
      g => g.type === 'schedule',
    ) as ScheduleGoalDefinition[];

    if (!scheduleGoalDefinitions.length) {
      return {
        schedules: [],
        statuses: new Map(),
        statusLabels: new Map(),
      };
    }

    const schedules = allSchedules.filter(s =>
      scheduleGoalDefinitions.some(g => g.name === s.name),
    );

    const scheduleIds = new Set(schedules.map(s => s.id));

    const statuses = new Map(
      [...allStatuses].filter(([id]) => scheduleIds.has(id)),
    );
    const statusLabels = new Map(
      [...allStatusLabels].filter(([id]) => scheduleIds.has(id)),
    );

    return {
      schedules,
      statuses,
      statusLabels,
    };
  }, [
    allSchedules,
    allStatusLabels,
    allStatuses,
    category,
    isGoalTemplatesEnabled,
  ]);
}
