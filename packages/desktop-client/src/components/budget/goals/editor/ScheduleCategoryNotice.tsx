import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
  RuleActionEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';

import { Information, Warning } from '#components/alerts';
import { useCategory } from '#hooks/useCategory';

type ScheduleCategoryNoticeProps = {
  schedule: ScheduleEntity;
  categoryId: string;
};

/**
 * Tells the user whether transactions linked to this schedule will land in
 * the category the automation budgets for, and offers to add (or fix) the
 * "set category" action on the schedule's rule.
 */
export function ScheduleCategoryNotice({
  schedule,
  categoryId,
}: ScheduleCategoryNoticeProps) {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);

  const categoryAction = (schedule._actions ?? []).find(isTopLevelSetCategory);
  const currentCategoryId =
    typeof categoryAction?.value === 'string' ? categoryAction.value : null;

  const { data: category } = useCategory(categoryId);
  const { data: currentCategory } = useCategory(currentCategoryId);

  // Split schedules categorize per split; leave those to the rule editor.
  if (schedule._has_splits || currentCategoryId === categoryId) {
    return null;
  }

  const categoryName = category?.name ?? t('this category');

  async function onSetCategory() {
    setIsUpdating(true);
    try {
      const rule = await send('rule-get', { id: schedule.rule });
      if (!rule) return;
      await send('rule-update', {
        ...rule,
        actions: [
          ...rule.actions.filter(action => !isTopLevelSetCategory(action)),
          { op: 'set', field: 'category', value: categoryId, type: 'id' },
        ],
      });
    } finally {
      setIsUpdating(false);
    }
  }

  const button = (
    <Button variant="bare" isDisabled={isUpdating} onPress={onSetCategory}>
      <Trans>Categorize as {{ category: categoryName }}</Trans>
    </Button>
  );

  const rowStyle = {
    width: '100%',
    justifyContent: 'space-between',
  } as const;

  if (currentCategoryId) {
    return (
      <Warning style={{ marginTop: 10 }}>
        <SpaceBetween gap={10} align="center" style={rowStyle}>
          <View>
            <Trans>
              This schedule's rule categorizes linked transactions as{' '}
              {{ current: currentCategory?.name ?? t('another category') }}.
            </Trans>
          </View>
          {button}
        </SpaceBetween>
      </Warning>
    );
  }

  return (
    <Information style={{ marginTop: 10 }}>
      <SpaceBetween gap={10} align="center" style={rowStyle}>
        <View>
          <Trans>
            Transactions linked to this schedule aren't categorized
            automatically.
          </Trans>
        </View>
        {button}
      </SpaceBetween>
    </Information>
  );
}

function isTopLevelSetCategory(action: RuleActionEntity) {
  return (
    action.op === 'set' &&
    action.field === 'category' &&
    !action.options?.splitIndex
  );
}
