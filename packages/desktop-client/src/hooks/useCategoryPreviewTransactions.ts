import { useMemo } from 'react';

import { usePreviewTransactions } from 'loot-core/client/data-hooks/transactions';
import * as monthUtils from 'loot-core/shared/months';
import { type CategoryEntity } from 'loot-core/types/models';

import { useCategory } from './useCategory';
import { useCategoryScheduleGoalTemplates } from './useCategoryScheduleGoalTemplates';

type UseCategoryPreviewTransactionsProps = {
  categoryId: CategoryEntity['id'];
  month: string;
};

export function useCategoryPreviewTransactions({
  categoryId,
  month,
}: UseCategoryPreviewTransactionsProps) {
  const category = useCategory(categoryId);
  const { schedules } = useCategoryScheduleGoalTemplates({
    category,
  });
  const { data: allPreviewTransactions, isLoading } = usePreviewTransactions();

  return useMemo(() => {
    const schedulesToPreview = new Set(
      schedules
        .filter(schedule => monthUtils.getMonth(schedule.next_date) === month)
        .map(schedule => schedule.id),
    );

    if (!category || !schedulesToPreview.size) {
      return {
        previewTransactions: [],
        isLoading: false,
      };
    }

    return {
      previewTransactions: allPreviewTransactions.filter(transaction =>
        transaction.schedule && schedulesToPreview.has(transaction.schedule),
      ),
      isLoading,
    };
  }, [allPreviewTransactions, category, isLoading, month, schedules]);
}
