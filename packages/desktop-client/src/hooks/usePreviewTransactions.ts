import { useEffect, useMemo, useState } from 'react';

import { send } from 'loot-core/platform/client/connection';
import { computeSchedulePreviewTransactions } from 'loot-core/shared/schedules';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import type { IntegerAmount } from 'loot-core/shared/util';
import type { ScheduleEntity, TransactionEntity } from 'loot-core/types/models';

import { useCachedSchedules } from './useCachedSchedules';
import { useScheduleStatus } from './useScheduleStatus';
import { useSyncedPref } from './useSyncedPref';
import { calculateRunningBalancesBottomUp } from './useTransactions';

type UsePreviewTransactionsProps = {
  filter?: (schedule: ScheduleEntity) => boolean;
  options?: {
    /**
     * Whether to calculate running balances.
     */
    calculateRunningBalances?: boolean;
    /**
     * The starting balance to start the running balance calculation from.
     * This is ignored if `calculateRunningBalances` is false.
     */
    startingBalance?: IntegerAmount;
  };
};

type UsePreviewTransactionsResult = {
  previewTransactions: ReadonlyArray<TransactionEntity>;
  runningBalances: Map<TransactionEntity['id'], IntegerAmount>;
  isLoading: boolean;
  error?: Error;
};

export function usePreviewTransactions({
  filter,
  options,
}: UsePreviewTransactionsProps = {}): UsePreviewTransactionsResult {
  const [previewTransactions, setPreviewTransactions] = useState<
    TransactionEntity[]
  >([]);
  const {
    isLoading: isSchedulesLoading,
    error: scheduleQueryError,
    data: schedules = [],
  } = useCachedSchedules();
  const {
    isLoading: isScheduleStatusLoading,
    data: { statusLookup = {} } = {},
  } = useScheduleStatus({ schedules });
  const [isLoading, setIsLoading] = useState(
    isSchedulesLoading || isScheduleStatusLoading,
  );
  const [error, setError] = useState<Error | undefined>(undefined);

  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');

  const scheduleTransactions = useMemo(() => {
    if (isSchedulesLoading || isScheduleStatusLoading) {
      return [];
    }

    return computeSchedulePreviewTransactions(
      schedules,
      statusLookup,
      upcomingLength,
      filter,
    );
  }, [
    filter,
    isSchedulesLoading,
    isScheduleStatusLoading,
    schedules,
    statusLookup,
    upcomingLength,
  ]);

  useEffect(() => {
    let isUnmounted = false;

    setError(undefined);

    if (scheduleTransactions.length === 0) {
      setIsLoading(false);
      setPreviewTransactions([]);
      return;
    }

    setIsLoading(true);

    Promise.all(
      scheduleTransactions.map(transaction =>
        // Kick off an async rules application
        send('rules-run', { transaction }),
      ),
    )
      .then(newTrans => {
        if (!isUnmounted) {
          const withDefaults = newTrans.map(t => ({
            ...t,
            category: t.schedule != null ? statusLookup[t.schedule] : undefined,
            schedule: t.schedule,
            subtransactions: t.subtransactions?.map(
              (st: TransactionEntity) => ({
                ...st,
                id: 'preview/' + st.id,
                schedule: t.schedule,
              }),
            ),
          }));

          const ungroupedTransactions = ungroupTransactions(withDefaults);
          setPreviewTransactions(ungroupedTransactions);

          setIsLoading(false);
        }
      })
      .catch(error => {
        if (!isUnmounted) {
          setError(error);
          setIsLoading(false);
        }
      });

    return () => {
      isUnmounted = true;
    };
  }, [scheduleTransactions, schedules, statusLookup, upcomingLength]);

  const runningBalances = useMemo(() => {
    if (!options?.calculateRunningBalances) {
      return new Map<TransactionEntity['id'], IntegerAmount>();
    }

    // We always use the bottom up calculation for preview transactions
    // because the hook controls the order of the transactions.
    return calculateRunningBalancesBottomUp(
      previewTransactions,
      'all',
      options?.startingBalance,
    );
  }, [
    previewTransactions,
    options?.calculateRunningBalances,
    options?.startingBalance,
  ]);

  const returnError = error || scheduleQueryError;
  return {
    previewTransactions,
    runningBalances,
    isLoading: isLoading || isSchedulesLoading || isScheduleStatusLoading,
    ...(returnError && { error: returnError }),
  };
}
