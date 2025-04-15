import {
  type ScheduleStatusLabelType,
  type ScheduleStatusType,
  useCachedSchedules,
} from 'loot-core/client/data-hooks/schedules';
import {
  type ScheduleEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { useNotes } from './useNotes';

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
  const notes = useNotes(category.id);
  const scheduleTemplate = notes
    ?.split('\n')
    ?.find(line => line.includes('#template schedule'));
  const scheduleName = scheduleTemplate
    ?.slice('#template schedule'.length)
    ?.trim();

  const { schedules, statuses, statusLabels } = useCachedSchedules();
  const schedule = schedules.find(s => s.name === scheduleName) ?? null;
  const status = schedule ? statuses.get(schedule.id) : null;
  const statusLabel = schedule ? statusLabels.get(schedule.id) : null;

  return {
    schedule,
    status,
    statusLabel,
  };
}
