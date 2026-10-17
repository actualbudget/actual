import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useCategoryScheduleGoalTemplateIndicator } from '#hooks/useCategoryScheduleGoalTemplateIndicator';

type CategoryScheduleIndicatorProps = {
  category: CategoryEntity;
  month: string;
};

export function CategoryScheduleIndicator({
  category,
  month,
}: CategoryScheduleIndicatorProps) {
  const { schedule, scheduleStatus, isScheduleRecurring, description } =
    useCategoryScheduleGoalTemplateIndicator({ category, month });

  if (!schedule || !scheduleStatus) {
    return null;
  }

  const color =
    scheduleStatus === 'missed'
      ? theme.errorText
      : scheduleStatus === 'due'
        ? theme.warningText
        : theme.pageTextLink;

  const Icon = isScheduleRecurring ? SvgArrowsSynchronize : SvgCalendar3;

  return (
    <>
      <Icon
        aria-hidden
        width={11}
        height={11}
        style={{ color, flexShrink: 0 }}
      />
      <Text style={styles.visuallyHidden}>{description}</Text>
    </>
  );
}
