import {
  type ScheduleStatusLabelType,
  type ScheduleStatusType,
  useCachedSchedules,
} from 'loot-core/client/data-hooks/schedules';
import {
  type ScheduleEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

type ScheduleGoalDefinition = {
  type: 'schedule';
  name: ScheduleEntity['name'];
};

type UseCategoryScheduleGoalTemplateProps = {
  category: CategoryEntity;
};

type UseCategoryScheduleGoalTemplateResult = {
  schedule?: ScheduleEntity | null;
  status?: ScheduleStatusType | null;
  statusLabel?: ScheduleStatusLabelType | null;
};

export function useCategoryScheduleGoalTemplate({
  category,
}: UseCategoryScheduleGoalTemplateProps): UseCategoryScheduleGoalTemplateResult {
  const { schedules, statuses, statusLabels } = useCachedSchedules();

  if (!category || !category.goal_def) {
    return {};
  }

  let goalDefinitions: Record<string, unknown>[] = [];
  try {
    goalDefinitions = JSON.parse(category.goal_def);
  } catch (e) {
    console.error('Failed to parse category goal_def:', e);
    return {};
  }

  const scheduleGoalDefinition = goalDefinitions.find(
    g => g.type === 'schedule',
  ) as ScheduleGoalDefinition | undefined;

  if (!scheduleGoalDefinition) {
    return {};
  }

  const schedule =
    schedules.find(s => s.name === scheduleGoalDefinition.name) ?? null;
  const status = schedule ? statuses.get(schedule.id) || null : null;
  const statusLabel = schedule ? statusLabels.get(schedule.id) || null : null;

  return {
    schedule,
    status,
    statusLabel,
  };
}
