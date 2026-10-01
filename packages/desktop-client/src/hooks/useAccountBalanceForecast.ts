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
  // Both are tagged with the account they belong to, so switching accounts
  // never projects or shows another account's balances.
  const [dateRange, setDateRange] = useState<{
    accountId: AccountView;
    first: string | null;
    last: string | null;
  } | null>(null);
  const [forecast, setForecast] = useState<{
    accountId: AccountView;
    points: DailyBalancePoint[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const today = monthUtils.currentDay();

  useEffect(() => {
    if (!isEnabled || !isForecastSupported(accountId)) {
      return;
    }

    // Re-run whenever the account's transactions change, so the projection
    // stays in sync with edits made in the table below. The range is only
    // reported once both ends are known.
    let first: string | null | undefined;
    let last: string | null | undefined;
    const report = () => {
      if (first !== undefined && last !== undefined) {
        setDateRange({ accountId, first, last });
      }
    };

    const rangeQuery = queries
      .transactions(accountId)
      .options({ splits: 'none' })
      .select('date');
    const firstLive = liveQuery<{ date: string }>(
      rangeQuery.orderBy({ date: 'asc' }).limit(1),
      {
        onData: data => {
          first = data[0]?.date ?? null;
          report();
        },
      },
    );
    const lastLive = liveQuery<{ date: string }>(
      rangeQuery.orderBy({ date: 'desc' }).limit(1),
      {
        onData: data => {
          last = data[0]?.date ?? null;
          report();
        },
      },
    );

    return () => {
      firstLive?.unsubscribe();
      lastLive?.unsubscribe();
    };
  }, [accountId, isEnabled]);

  const accountIdsKey = resolveAccountIds(accountId, accounts).join(',');
  const currentRange =
    dateRange !== null && dateRange.accountId === accountId ? dateRange : null;
  const upcomingEndDate = monthUtils.addDays(
    today,
    getUpcomingDays(upcomingLength),
  );
  const endDate = [upcomingEndDate, currentRange?.last, minEndDate]
    .filter((date): date is string => !!date)
    .reduce((max, date) => (date > max ? date : max), today);
  const startDate =
    currentRange?.first && currentRange.first < today
      ? currentRange.first
      : today;

  useEffect(() => {
    if (!isEnabled || !isForecastSupported(accountId) || !currentRange) {
      return;
    }
    if (accountIdsKey === '') {
      setForecast({ accountId, points: [] });
      setIsLoading(false);
      return;
    }

    let isUnmounted = false;
    setIsLoading(true);

    send('forecast/generate', {
      accountIds: accountIdsKey.split(','),
      startDate,
      endDate,
      source: 'schedules',
      includeAccountlessSchedules:
        accountId === undefined || accountId === 'onbudget',
    })
      .then(result => {
        if (!isUnmounted) {
          setForecast({
            accountId,
            points: buildDailyBalancePoints(result.dataPoints, today),
          });
          setIsLoading(false);
        }
      })
      .catch(error => {
        console.error('Error generating the account forecast:', error);
        if (!isUnmounted) {
          setForecast({ accountId, points: [] });
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
    currentRange,
    startDate,
    endDate,
    today,
    schedules,
  ]);

  const isCurrent = forecast !== null && forecast.accountId === accountId;
  return {
    points: isCurrent ? forecast.points : [],
    today,
    isLoading: isLoading || !isCurrent,
  };
}
