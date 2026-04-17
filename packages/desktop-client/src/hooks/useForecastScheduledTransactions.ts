import { useEffect, useMemo, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { computeSchedulePreviewTransactions } from '@actual-app/core/shared/schedules';
import { ungroupTransactions } from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { useSchedules } from './useSchedules';
import { useSyncedPref } from './useSyncedPref';

type ForecastScheduledResult = {
  forecastTransactionsByCategoryAndMonth: Map<string, TransactionEntity[]>;
  isLoading: boolean;
};

const schedulesQuery = q('schedules').select('*');

export function useForecastScheduledTransactions(): ForecastScheduledResult {
  const {
    schedules,
    statuses,
    isLoading: schedulesLoading,
  } = useSchedules({ query: schedulesQuery });
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');
  const [result, setResult] = useState<Map<string, TransactionEntity[]>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const previewTransactions = useMemo(() => {
    if (schedulesLoading) return [];
    return computeSchedulePreviewTransactions(
      schedules,
      statuses,
      upcomingLength,
    );
  }, [schedulesLoading, schedules, statuses, upcomingLength]);

  useEffect(() => {
    let isUnmounted = false;

    if (previewTransactions.length === 0) {
      setResult(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    Promise.all(
      previewTransactions.map(transaction =>
        send('rules-run', { transaction }),
      ),
    )
      .then(processedTransactions => {
        if (isUnmounted) return;

        const withSchedule = processedTransactions.map(t => ({
          ...t,
          schedule: t.schedule,
          subtransactions: t.subtransactions?.map((st: TransactionEntity) => ({
            ...st,
            id: 'preview/' + st.id,
            schedule: t.schedule,
          })),
        }));

        const ungrouped = ungroupTransactions(withSchedule);
        const map = new Map<string, TransactionEntity[]>();

        for (const t of ungrouped) {
          if (!t.category || !t.date) continue;
          const month = monthUtils.monthFromDate(t.date);
          const key = `${t.category}-${month}`;
          const existing = map.get(key) ?? [];
          existing.push(t);
          map.set(key, existing);
        }

        setResult(map);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isUnmounted) {
          setResult(new Map());
          setIsLoading(false);
        }
      });

    return () => {
      isUnmounted = true;
    };
  }, [previewTransactions]);

  return {
    forecastTransactionsByCategoryAndMonth: result,
    isLoading,
  };
}
