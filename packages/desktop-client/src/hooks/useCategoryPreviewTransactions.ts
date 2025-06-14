import { useCallback, useMemo } from 'react';

import * as monthUtils from 'loot-core/shared/months';
import {
  type ScheduleEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { useCategory } from './useCategory';
import { useCategoryScheduleGoalTemplates } from './useCategoryScheduleGoalTemplates';
import { usePreviewTransactions } from './usePreviewTransactions';
import { useSheetValue } from './useSheetValue';

import { categoryBalance } from '@desktop-client/spreadsheet/bindings';

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
  const category = useCategory(categoryId);
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
        isLoading: false,
        error: undefined,
      };
    }

    const previewTransactions = allPreviewTransactions.filter(
      transaction =>
        transaction.schedule && schedulesToPreview.has(transaction.schedule),
    );

    const transactionIds = new Set(previewTransactions.map(t => t.id));
    const runningBalances = allRunningBalances;
    for (const transactionId of runningBalances.keys()) {
      if (!transactionIds.has(transactionId)) {
        runningBalances.delete(transactionId);
      }
    }

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
