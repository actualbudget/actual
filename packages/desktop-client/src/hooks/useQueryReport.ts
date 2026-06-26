import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

type EvaluateResult =
  | { success: true; query: Query }
  | {
      success: false;
      kind: 'unresolved-params' | 'syntax';
      unresolvedParams?: string[];
    };

export function evaluateQuerySource(source: string): EvaluateResult {
  try {
    // oxlint-disable-next-line eslint/no-new-func typescript/no-implied-eval
    const fn = new Function('q', `return (${source})`);
    const query = fn(q);
    return { success: true, query };
  } catch {
    const unresolvedParams = source.match(/:[a-zA-Z_]\w*/g);
    if (unresolvedParams) {
      return {
        success: false,
        kind: 'unresolved-params',
        unresolvedParams,
      };
    }
    return { success: false, kind: 'syntax' };
  }
}

function getCompileError(
  evaluated: EvaluateResult,
  t: (key: string, options?: Record<string, string>) => string,
): AqlErrorDetail | null {
  if (evaluated.success === true) return null;
  if (evaluated.kind === 'unresolved-params') {
    const paramList = evaluated.unresolvedParams ?? [];
    const paramLabel = paramList.join(', ');
    return {
      type: 'compile-error',
      message: t(
        'Unresolved parameter{{suffix}}: {{params}}. Select a time range to provide values for these parameters.',
        {
          suffix: paramList.length > 1 ? 's' : '',
          params: paramLabel,
        },
      ),
    };
  }
  return {
    type: 'compile-error',
    message: t('Invalid query syntax'),
  };
}

export function useQueryReport(
  querySource: string | null,
  timeFrame?: TimeFrame,
): UseQueryReportResult {
  const { t } = useTranslation();
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

    setIsLoading(true);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const params = resolveTimeFrameParams(timeFrame);
        const resolvedSource = applyQueryParams(querySource, params);
        const evaluated = evaluateQuerySource(resolvedSource);
        if (evaluated.success !== true) {
          setError(getCompileError(evaluated, t));
          setResult(null);
          setIsLoading(false);
          return;
        }

        const query = evaluated.query;
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
  }, [querySource, timeFrame, t]);

  return { result, isLoading, error };
}

export function applyQueryParams(
  source: string,
  params: Record<string, string>,
): string {
  if (!source || Object.keys(params).length === 0) return source;
  let result = source;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`:${key}`, `'${value}'`);
  }
  return result;
}

export function resolveTimeFrameParams(
  timeFrame?: TimeFrame,
): Record<string, string> {
  if (!timeFrame) return {};

  const [start, end] = calculateTimeRange(timeFrame);
  return {
    startDate: normalizeQueryTimeFrameStart(start),
    endDate: normalizeQueryTimeFrameEnd(end),
  };
}
