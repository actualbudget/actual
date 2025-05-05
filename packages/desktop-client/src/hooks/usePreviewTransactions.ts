import { useState, useMemo, useEffect } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import { parseDate, currentDay, addDays } from 'loot-core/shared/months';
import {
  getUpcomingDays,
  extractScheduleConds,
  scheduleIsRecurring,
  getNextDate,
  getScheduledAmount,
} from 'loot-core/shared/schedules';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import type { ScheduleEntity, TransactionEntity } from 'loot-core/types/models';

import { useCachedSchedules } from './useCachedSchedules';
import { type ScheduleStatuses } from './useSchedules';
import { useSyncedPref } from './useSyncedPref';

type UsePreviewTransactionsResult = {
  data: ReadonlyArray<TransactionEntity>;
  isLoading: boolean;
  error?: Error;
};

export function usePreviewTransactions(): UsePreviewTransactionsResult {
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

    // Kick off an async rules application
    const schedulesForPreview = schedules.filter(s =>
      isForPreview(s, statuses),
    );

    const today = d.startOfDay(parseDate(currentDay()));

    const upcomingPeriodEnd = d.startOfDay(
      parseDate(addDays(today, getUpcomingDays(upcomingLength))),
    );

    return schedulesForPreview
      .map(schedule => {
        const { date: dateConditions } = extractScheduleConds(
          schedule._conditions,
        );

        const status = statuses.get(schedule.id);
        const isRecurring = scheduleIsRecurring(dateConditions);

        const dates: string[] = [schedule.next_date];
        let day = d.startOfDay(parseDate(schedule.next_date));
        if (isRecurring) {
          while (day <= upcomingPeriodEnd) {
            const nextDate = getNextDate(dateConditions, day);

            if (d.startOfDay(parseDate(nextDate)) > upcomingPeriodEnd) break;

            if (dates.includes(nextDate)) {
              day = d.startOfDay(parseDate(addDays(day, 1)));
              continue;
            }

            dates.push(nextDate);
            day = d.startOfDay(parseDate(addDays(nextDate, 1)));
          }
        }

        if (status === 'paid') {
          dates.shift();
        }

        const schedules: {
          id: string;
          payee: string;
          account: string;
          amount: number;
          date: string;
          schedule: string;
          forceUpcoming: boolean;
        }[] = [];
        dates.forEach(date => {
          schedules.push({
            id: 'preview/' + schedule.id + `/${date}`,
            payee: schedule._payee,
            account: schedule._account,
            amount: getScheduledAmount(schedule._amount),
            date,
            schedule: schedule.id,
            forceUpcoming: date !== schedule.next_date || status === 'paid',
          });
        });

        return schedules;
      })
      .flat()
      .sort(
        (a, b) =>
          parseDate(b.date).getTime() - parseDate(a.date).getTime() ||
          a.amount - b.amount,
      );
  }, [isSchedulesLoading, schedules, statuses, upcomingLength]);

  useEffect(() => {
    let isUnmounted = false;

    setError(undefined);

    if (scheduleTransactions.length === 0) {
      setPreviewTransactions([]);
      return;
    }

    setIsLoading(true);

    Promise.all(
      scheduleTransactions.map(transaction =>
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

          setPreviewTransactions(ungroupTransactions(withDefaults));
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
    data: previewTransactions,
    isLoading: isLoading || isSchedulesLoading,
    ...(returnError && { error: returnError }),
  };
}

export function isForPreview(
  schedule: ScheduleEntity,
  statuses: ScheduleStatuses,
) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    ['due', 'upcoming', 'missed', 'paid'].includes(status!)
  );
}
