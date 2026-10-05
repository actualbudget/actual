import { useEffect, useMemo, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { computeSchedulePreviewTransactions } from '@actual-app/core/shared/schedules';
import { ungroupTransactions } from '@actual-app/core/shared/transactions';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { useAccounts } from './useAccounts';
import { useCachedSchedules } from './useCachedSchedules';
import { useSyncedPref } from './useSyncedPref';
import { calculateRunningBalancesBottomUp } from './useTransactions';

type UsePreviewTransactionsProps = {
  filter?: (schedule: ScheduleEntity) => boolean;
  /**
   * The foreign account whose own register shows its schedules natively.
   * Other views are in the budget currency and leave out foreign schedules
   * until they are posted.
   */
  foreignAccountId?: AccountEntity['id'];
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

export function comparePreviewTransactions(
  a: Pick<TransactionEntity, 'date' | 'amount'> & {
    sort_order?: number | null;
  },
  b: Pick<TransactionEntity, 'date' | 'amount'> & {
    sort_order?: number | null;
  },
): number {
  const dateDiff =
    monthUtils.parseDate(b.date).getTime() -
    monthUtils.parseDate(a.date).getTime();
  if (dateDiff !== 0) return dateDiff;

  const sortOrderDiff = (b.sort_order ?? 0) - (a.sort_order ?? 0);
  if (sortOrderDiff !== 0) return sortOrderDiff;

  return a.amount - b.amount;
}

/**
 * Schedules a view previews: foreign schedules only in their own account's
 * register, since other views are in the budget currency.
 */
export function previewScheduleFilter(
  accounts: ReadonlyArray<Pick<AccountEntity, 'id' | 'currency'>>,
  foreignAccountId: AccountEntity['id'] | undefined,
  filter?: (schedule: ScheduleEntity) => boolean,
) {
  const foreignAccountIds = new Set(
    accounts.filter(account => account.currency).map(account => account.id),
  );
  // A foreign register shows only its own schedules: transfers to it from
  // other accounts would carry amounts in another currency.
  const foreignRegister =
    foreignAccountId !== undefined && foreignAccountIds.has(foreignAccountId);
  return (schedule: ScheduleEntity) =>
    (foreignRegister
      ? schedule._account === foreignAccountId
      : !foreignAccountIds.has(schedule._account)) &&
    (filter ? filter(schedule) : true);
}

export function usePreviewTransactions({
  filter,
  foreignAccountId,
  options,
}: UsePreviewTransactionsProps = {}): UsePreviewTransactionsResult {
  const { data: accounts = [] } = useAccounts();
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

  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');

  const scheduleTransactions = useMemo(() => {
    if (isSchedulesLoading) {
      return [];
    }

    return computeSchedulePreviewTransactions(
      schedules,
      statuses,
      upcomingLength,
      previewScheduleFilter(accounts, foreignAccountId, filter),
    );
  }, [
    accounts,
    filter,
    foreignAccountId,
    isSchedulesLoading,
    schedules,
    statuses,
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

    // A foreign schedule's preview has no base amount yet: rules see its
    // native amount only, and ordinary amount conditions do not match.
    const foreignAccountIds = new Set(
      accounts.filter(account => account.currency).map(account => account.id),
    );
    Promise.all(
      scheduleTransactions.map(transaction =>
        // Kick off an async rules application
        send('rules-run', {
          transaction,
          amountIsNative: foreignAccountIds.has(transaction.account),
        }),
      ),
    )
      .then(newTrans => {
        if (!isUnmounted) {
          const scheduleById = new Map(schedules.map(s => [s.id, s]));
          const withDefaults = newTrans.map(t => ({
            ...t,
            category: t.schedule != null ? statuses.get(t.schedule) : undefined,
            schedule: t.schedule,
            sort_order:
              t.schedule != null
                ? scheduleById.get(t.schedule)?.sort_order
                : undefined,
            subtransactions: t.subtransactions?.map(
              (st: TransactionEntity) => ({
                ...st,
                id: 'preview/' + st.id,
                schedule: t.schedule,
              }),
            ),
          }));

          // re-sort in case rule actions have changed the dates
          withDefaults.sort(comparePreviewTransactions);

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
  }, [scheduleTransactions, schedules, statuses, upcomingLength, accounts]);

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
    isLoading: isLoading || isSchedulesLoading,
    ...(returnError && { error: returnError }),
  };
}
