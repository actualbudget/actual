// @ts-strict-ignore
import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  useMemo,
} from 'react';

import { q, type Query } from '../../shared/query';
import { getStatus, getHasTransactionsQuery } from '../../shared/schedules';
import { type ScheduleEntity } from '../../types/models';
import { getAccountFilter } from '../queries';
import { liveQuery } from '../query-helpers';
import { useSelector } from 'react-redux';
import { State } from 'loot-core/client/state-types';

export type ScheduleStatusType = ReturnType<typeof getStatus>;
export type ScheduleStatuses = Map<ScheduleEntity['id'], ScheduleStatusType>;

function loadStatuses(schedules: ScheduleEntity[], onData, prefs) {
  return liveQuery(getHasTransactionsQuery(schedules), onData, {
    mapper: data => {
      const hasTrans = new Set(data.filter(Boolean).map(row => row.schedule));

      return new Map(
        schedules.map(s => [
          s.id,
          getStatus(s.next_date, s.completed, hasTrans.has(s.id), prefs),
        ]),
      );
    },
  });
}

type UseSchedulesArgs = { transform?: (q: Query) => Query };
type UseSchedulesResult = {
  schedules: ScheduleEntity[];
  statuses: ScheduleStatuses;
} | null;

export function useSchedules({
  transform,
}: UseSchedulesArgs = {}): UseSchedulesResult {
  const [data, setData] = useState<UseSchedulesResult>(null);
  const prefs = useSelector((state: State) => state.prefs);
  useEffect(() => {
    const query = q('schedules').select('*');
    let statusQuery;

    const scheduleQuery = liveQuery(
      transform ? transform(query) : query,
      async (schedules: ScheduleEntity[]) => {
        if (scheduleQuery) {
          if (statusQuery) {
            statusQuery.unsubscribe();
          }

          statusQuery = loadStatuses(
            schedules,
            (statuses: ScheduleStatuses) => setData({ schedules, statuses }),
            prefs,
          );
        }
      },
    );

    return () => {
      if (scheduleQuery) {
        scheduleQuery.unsubscribe();
      }
      if (statusQuery) {
        statusQuery.unsubscribe();
      }
    };
  }, [transform]);

  return data;
}

type SchedulesContextValue = UseSchedulesResult;

const SchedulesContext = createContext<SchedulesContextValue | undefined>(
  undefined,
);

export function SchedulesProvider({ transform, children }) {
  const data = useSchedules({ transform });
  return (
    <SchedulesContext.Provider value={data}>
      {children}
    </SchedulesContext.Provider>
  );
}

export function useCachedSchedules() {
  return useContext(SchedulesContext);
}

export function useDefaultSchedulesQueryTransform(accountId) {
  return useMemo(() => {
    const filterByAccount = getAccountFilter(accountId, '_account');
    const filterByPayee = getAccountFilter(accountId, '_payee.transfer_acct');

    return (q: Query) => {
      q = q.filter({
        $and: [{ '_account.closed': false }],
      });
      if (accountId) {
        if (accountId === 'uncategorized') {
          q = q.filter({ next_date: null });
        } else {
          q = q.filter({
            $or: [filterByAccount, filterByPayee],
          });
        }
      }
      return q.orderBy({ next_date: 'desc' });
    };
  }, [accountId]);
}
