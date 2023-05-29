import React, { createContext, useEffect, useState, useContext } from 'react';

import { getStatus, getHasTransactionsQuery } from '../../shared/schedules';
import q, { liveQuery } from '../query-helpers';

function loadStatuses(schedules, onData) {
  return liveQuery(getHasTransactionsQuery(schedules), onData, {
    mapper: data => {
      let hasTrans = new Set(data.filter(Boolean).map(row => row.schedule));

      return new Map(
        schedules.map(s => [
          s.id,
          getStatus(s.next_date, s.completed, hasTrans.has(s.id)),
        ]),
      );
    },
  });
}

type UseSchedulesArgs = { transform?: <T>(v: T) => T };
export function useSchedules({ transform }: UseSchedulesArgs = {}) {
  let [data, setData] = useState(null);

  useEffect(() => {
    let query = q('schedules').select('*');
    let scheduleQuery, statusQuery;

    scheduleQuery = liveQuery(
      transform ? transform(query) : query,
      async schedules => {
        if (scheduleQuery) {
          if (statusQuery) {
            statusQuery.unsubscribe();
          }

          statusQuery = loadStatuses(schedules, statuses =>
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

let SchedulesContext = createContext(null);

export function SchedulesProvider({ transform, children }) {
  let data = useSchedules({ transform });
  return <SchedulesContext.Provider value={data} children={children} />;
}

export function useCachedSchedules() {
  return useContext(SchedulesContext);
}
