import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { getUpcomingDays } from '@actual-app/core/shared/schedules';
import type { AccountEntity } from '@actual-app/core/types/models';

import { buildDailyBalancePoints } from '#components/accounts/balanceHistoryGraphData';
import type { DailyBalancePoint } from '#components/accounts/balanceHistoryGraphData';
import * as queries from '#queries';
import { liveQuery } from '#queries/liveQuery';

import { useAccounts } from './useAccounts';
import { useCachedSchedules } from './useCachedSchedules';
import { useSyncedPref } from './useSyncedPref';

type AccountView =
  | AccountEntity['id']
  | 'onbudget'
  | 'offbudget'
  | 'closed'
  | 'uncategorized'
  | undefined;

type UseAccountBalanceForecastProps = {
  accountId: AccountView;
  // Extends the projection so a date picked beyond the upcoming length is
  // still covered.
  minEndDate?: string | null;
  isEnabled: boolean;
};

type UseAccountBalanceForecastResult = {
  points: DailyBalancePoint[];
  today: string;
  isLoading: boolean;
};

export function isForecastSupported(accountId: AccountView) {
  return accountId !== 'uncategorized';
}

function resolveAccountIds(
  accountId: AccountView,
  accounts: readonly AccountEntity[],
): string[] {
  switch (accountId) {
    case undefined:
      return accounts.filter(a => !a.closed).map(a => a.id);
    case 'onbudget':
      return accounts.filter(a => !a.closed && !a.offbudget).map(a => a.id);
    case 'offbudget':
      return accounts.filter(a => !a.closed && a.offbudget).map(a => a.id);
    case 'closed':
      return accounts.filter(a => a.closed).map(a => a.id);
    default:
      return [accountId];
  }
}

export function useAccountBalanceForecast({
  accountId,
  minEndDate,
  isEnabled,
}: UseAccountBalanceForecastProps): UseAccountBalanceForecastResult {
  const { data: accounts = [] } = useAccounts();
  const { schedules } = useCachedSchedules();
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');
  const [dateRange, setDateRange] = useState<{
    first: string | null;
    last: string | null;
  } | null>(null);
  const [points, setPoints] = useState<DailyBalancePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const today = monthUtils.currentDay();

  useEffect(() => {
    if (!isEnabled || !isForecastSupported(accountId)) {
      return;
    }

    // Re-run whenever the account's transactions change, so the projection
    // stays in sync with edits made in the table below.
    const rangeQuery = queries
      .transactions(accountId)
      .options({ splits: 'none' })
      .select('date');
    const firstLive = liveQuery<{ date: string }>(
      rangeQuery.orderBy({ date: 'asc' }).limit(1),
      {
        onData: data =>
          setDateRange(range => ({
            first: data[0]?.date ?? null,
            last: range?.last ?? null,
          })),
      },
    );
    const lastLive = liveQuery<{ date: string }>(
      rangeQuery.orderBy({ date: 'desc' }).limit(1),
      {
        onData: data =>
          setDateRange(range => ({
            first: range?.first ?? null,
            last: data[0]?.date ?? null,
          })),
      },
    );

    return () => {
      firstLive?.unsubscribe();
      lastLive?.unsubscribe();
    };
  }, [accountId, isEnabled]);

  const accountIdsKey = resolveAccountIds(accountId, accounts).join(',');
  const upcomingEndDate = monthUtils.addDays(
    today,
    getUpcomingDays(upcomingLength),
  );
  const endDate = [upcomingEndDate, dateRange?.last, minEndDate]
    .filter((date): date is string => !!date)
    .reduce((max, date) => (date > max ? date : max), today);
  const startDate =
    dateRange?.first && dateRange.first < today ? dateRange.first : today;

  useEffect(() => {
    if (!isEnabled || !isForecastSupported(accountId) || dateRange === null) {
      return;
    }
    if (accountIdsKey === '') {
      setPoints([]);
      setIsLoading(false);
      return;
    }

    let isUnmounted = false;
    setIsLoading(true);

    void send('forecast/generate', {
      accountIds: accountIdsKey.split(','),
      startDate,
      endDate,
      source: 'schedules',
      includeAccountlessSchedules:
        accountId === undefined || accountId === 'onbudget',
    }).then(result => {
      if (!isUnmounted) {
        setPoints(buildDailyBalancePoints(result.dataPoints, today));
        setIsLoading(false);
      }
    });

    return () => {
      isUnmounted = true;
    };
  }, [
    isEnabled,
    accountId,
    accountIdsKey,
    dateRange,
    startDate,
    endDate,
    today,
    schedules,
  ]);

  return { points, today, isLoading };
}
