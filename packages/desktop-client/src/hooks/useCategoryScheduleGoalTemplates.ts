import { useMemo } from 'react';

import {
  type ScheduleStatuses,
  type ScheduleStatusLabels,
  useCachedSchedules,
} from 'loot-core/client/data-hooks/schedules';
import {
  type ScheduleEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { useFeatureFlag } from './useFeatureFlag';

type ScheduleGoalDefinition = {
  type: 'schedule';
  name: ScheduleEntity['name'];
};

type UseCategoryScheduleGoalTemplatesProps = {
  category: CategoryEntity;
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
  
    if (!scheduleGoalDefinitions?.length) {
      return {
        schedules: [],
        statuses: new Map(),
        statusLabels: new Map(),
      };
    }
  
    const schedules = allSchedules.filter(s =>
      scheduleGoalDefinitions.some(g => g.name === s.name),
    );
    const statuses = new Map(
      [...allStatuses].filter(([id]) => schedules.some(s => s.id === id)),
    );
    const statusLabels = new Map(
      [...allStatusLabels].filter(([id]) => schedules.some(s => s.id === id)),
    );
  
    return {
      schedules,
      statuses,
      statusLabels,
    };
  }, [allSchedules, allStatusLabels, allStatuses, category, isGoalTemplatesEnabled]);
}
