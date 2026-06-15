import { useEffect, useRef, useState } from 'react';

import { q } from 'loot-core/shared/query';
import type { Query } from 'loot-core/shared/query';
import type { AqlErrorDetail } from 'loot-core/types/aql';
import type { TimeFrame } from 'loot-core/types/models';

import {
  normalizeQueryTimeFrameEnd,
  normalizeQueryTimeFrameStart,
} from '@desktop-client/components/formula/queryTimeFrame';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { aqlQuery, AqlQueryError } from '@desktop-client/queries/aqlQuery';
import { processQueryResult } from '@desktop-client/queries/processQueryResult';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type UseQueryReportResult = {
  result: QueryResult | null;
  isLoading: boolean;
  error: AqlErrorDetail | null;
};

export function useQueryReport(
  querySource: string | null,
  timeFrame?: TimeFrame,
): UseQueryReportResult {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AqlErrorDetail | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!querySource) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const query = evaluateQuerySource(querySource);
        if (!query) {
          setError({ type: 'compile-error', message: 'Invalid query syntax' });
          setResult(null);
          setIsLoading(false);
          return;
        }

        const raw = await aqlQuery(query);
        const processed = processQueryResult(
          raw.data,
          raw.columns,
          query.state.calculation,
        );
        setResult(processed);
      } catch (e) {
        if (e instanceof AqlQueryError) {
          setError(e.detail);
        } else if (e instanceof Error) {
          setError({ type: 'runtime-error', message: e.message });
        }
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [querySource, timeFrame]);

  return { result, isLoading, error };
}

function evaluateQuerySource(source: string): Query | null {
  try {
    // oxlint-disable-next-line eslint/no-new-func typescript/no-implied-eval
    const fn = new Function('q', `return (${source})`);
    return fn(q);
  } catch {
    return null;
  }
}

export function resolveTimeFrameParams(
  timeFrame?: TimeFrame,
): Record<string, string> {
  if (!timeFrame || timeFrame.mode === 'full') return {};

  const [start, end] = calculateTimeRange(timeFrame);
  return {
    startDate: normalizeQueryTimeFrameStart(start),
    endDate: normalizeQueryTimeFrameEnd(end),
  };
}
