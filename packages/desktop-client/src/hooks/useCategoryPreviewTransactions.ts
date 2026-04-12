import { useCallback, useMemo } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';

import { categoryBalance } from '#spreadsheet/bindings';

import { useCategory } from './useCategory';
import { useCategoryScheduleGoalTemplates } from './useCategoryScheduleGoalTemplates';
import { usePreviewTransactions } from './usePreviewTransactions';
import { useSheetValue } from './useSheetValue';

type UseCategoryPreviewTransactionsProps = {
  categoryId: CategoryEntity['id'];
  month: string;
};

type UseCategoryPreviewTransactionsResult = ReturnType<
  typeof usePreviewTransactions
>;

export function useCategoryPreviewTransactions({
  categoryId,
  month,
}: UseCategoryPreviewTransactionsProps): UseCategoryPreviewTransactionsResult {
  const { data: category } = useCategory(categoryId);
  const { schedules } = useCategoryScheduleGoalTemplates({
    category,
  });

  const schedulesToPreview = useMemo(
    () =>
      new Set(
        schedules
          .filter(schedule => monthUtils.getMonth(schedule.next_date) === month)
          .map(schedule => schedule.id),
      ),
    [month, schedules],
  );
  const categoryBalanceValue = useSheetValue<'category', 'balance'>(
    categoryBalance(categoryId, month),
  );

  const categorySchedulesFilter = useCallback(
    (schedule: ScheduleEntity) => schedulesToPreview.has(schedule.id),
    [schedulesToPreview],
  );

  const {
    previewTransactions: allPreviewTransactions,
    runningBalances: allRunningBalances,
    isLoading,
    error,
  } = usePreviewTransactions({
    filter: categorySchedulesFilter,
    options: {
      startingBalance: categoryBalanceValue ?? 0,
    },
  });

  return useMemo(() => {
    if (!category || !schedulesToPreview.size) {
      return {
        previewTransactions: [],
        runningBalances: new Map(),
        isLoading,
        error,
      };
    }

    const previewTransactions = allPreviewTransactions.filter(
      transaction =>
        transaction.schedule && schedulesToPreview.has(transaction.schedule),
    );

    const transactionIds = new Set(previewTransactions.map(t => t.id));
    const runningBalances = new Map(
      [...allRunningBalances].filter(([id]) => transactionIds.has(id)),
    );

    return {
      previewTransactions,
      runningBalances,
      isLoading,
      error,
    };
  }, [
    allPreviewTransactions,
    allRunningBalances,
    category,
    error,
    isLoading,
    schedulesToPreview,
  ]);
}
