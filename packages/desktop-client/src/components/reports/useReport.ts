import { useQuery } from '@tanstack/react-query';
import type {
  QueryObserverResult,
  RefetchOptions,
} from '@tanstack/react-query';

import { useSpreadsheet } from '#hooks/useSpreadsheet';

export type UseReportValue<T> = {
  data: T | null;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<T, Error>>;
};

export function useReport<T>(
  sheetName: string,
  getData: (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (results: T) => void,
  ) => Promise<void> | void,
  queryKey: unknown[],
): UseReportValue<T> {
  const spreadsheet = useSpreadsheet();

  const { data, refetch } = useQuery({
    queryKey: queryKey
      ? ['report', sheetName, ...queryKey]
      : ['report', sheetName],
    queryFn: () => {
      return new Promise<T>((resolve, reject) => {
        try {
          const result = getData(spreadsheet, resolve);
          if (result instanceof Promise) {
            result.catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });
    },
  });

  return { data: data ?? null, refetch };
}
