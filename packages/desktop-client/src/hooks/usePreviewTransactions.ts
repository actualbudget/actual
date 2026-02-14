import { useEffect, useMemo, useRef, useState } from 'react';

import { send } from 'loot-core/platform/client/connection';
import { computeSchedulePreviewTransactions } from 'loot-core/shared/schedules';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import type { IntegerAmount } from 'loot-core/shared/util';
import type { ScheduleEntity, TransactionEntity } from 'loot-core/types/models';

import { useCachedSchedules } from './useCachedSchedules';
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
    schedules,
    statuses,
  } = useCachedSchedules();
  const [isLoading, setIsLoading] = useState(isSchedulesLoading);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [runningBalances, setRunningBalances] = useState<
    Map<TransactionEntity['id'], IntegerAmount>
  >(new Map());

  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');

  // We don't want to re-render if options changes.
  // Putting options in a ref will prevent that and
  // allow us to use the latest options on next render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const scheduleTransactions = useMemo(() => {
    if (isSchedulesLoading) {
      return [];
    }

    return computeSchedulePreviewTransactions(
      schedules,
      statuses,
      upcomingLength,
      filter,
    );
  }, [filter, isSchedulesLoading, schedules, statuses, upcomingLength]);

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
            category: t.schedule != null ? statuses.get(t.schedule) : undefined,
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

          if (optionsRef.current?.calculateRunningBalances) {
            setRunningBalances(
              // We always use the bottom up calculation for preview transactions
              // because the hook controls the order of the transactions. We don't
              // need to provide a custom way for consumers to calculate the running
              // balances, at least as of writing.
              calculateRunningBalancesBottomUp(
                ungroupedTransactions,
                // Preview transactions are behaves like 'all' splits
                'all',
                optionsRef.current?.startingBalance,
              ),
            );
          }

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
  }, [scheduleTransactions, schedules, statuses, upcomingLength]);

  const returnError = error || scheduleQueryError;
  return {
    previewTransactions,
    runningBalances,
    isLoading: isLoading || isSchedulesLoading,
    ...(returnError && { error: returnError }),
  };
}
