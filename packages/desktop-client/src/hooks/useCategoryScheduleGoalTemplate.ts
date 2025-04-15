import {
  type ScheduleStatusLabelType,
  type ScheduleStatusType,
  useCachedSchedules,
} from 'loot-core/client/data-hooks/schedules';
import {
  type ScheduleEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

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

  // TODO: Define type for GoalDefinition
  const goalDefinitions: Record<string, unknown>[] = JSON.parse(category.goal_def);
  const scheduleGoalDefinition = goalDefinitions.find(
    g => g.type === 'schedule',
  );

  if (!scheduleGoalDefinition) {
    return {};
  }

  const schedule =
    schedules.find(s => s.name === scheduleGoalDefinition.name) ?? null;
  const status = schedule ? statuses.get(schedule.id) : null;
  const statusLabel = schedule ? statusLabels.get(schedule.id) : null;

  return {
    schedule,
    status,
    statusLabel,
  };
}
