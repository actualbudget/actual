// @ts-strict-ignore
import React, { createContext, useEffect, useState, useContext } from 'react';

import { q, type Query } from '../../shared/query';
import { getStatus, getHasTransactionsQuery } from '../../shared/schedules';
import { type ScheduleEntity } from '../../types/models';
import { liveQuery } from '../query-helpers';

export type ScheduleStatusType = ReturnType<typeof getStatus>;
export type ScheduleStatuses = Map<ScheduleEntity['id'], ScheduleStatusType>;

function loadStatuses(schedules: ScheduleEntity[], onData) {
  return liveQuery(getHasTransactionsQuery(schedules), onData, {
    mapper: data => {
      const hasTrans = new Set(data.filter(Boolean).map(row => row.schedule));

      return new Map(
        schedules.map(s => [
          s.id,
          getStatus(s.next_date, s.completed, hasTrans.has(s.id)),
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

          statusQuery = loadStatuses(schedules, (statuses: ScheduleStatuses) =>
            setData({ schedules, statuses }),
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
