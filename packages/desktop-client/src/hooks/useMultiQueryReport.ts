import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AqlErrorDetail } from 'loot-core/types/aql';
import type { TimeFrame } from 'loot-core/types/models';

import {
  applyQueryParams,
  evaluateQuerySource,
  resolveTimeFrameParams,
} from './useQueryReport';

import { aqlQuery, AqlQueryError } from '@desktop-client/queries/aqlQuery';
import { mergeQueryResults } from '@desktop-client/queries/mergeQueryResults';
import type { MergeError } from '@desktop-client/queries/mergeQueryResults';
import { processQueryResult } from '@desktop-client/queries/processQueryResult';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

export type UseMultiQueryReportResult = {
  results: QueryResult[];
  merged: QueryResult | null;
  mergeError: string | null;
  perQueryErrors: (AqlErrorDetail | null)[];
  isLoading: boolean;
};

function getCompileError(
  source: string,
  t: (key: string, options?: Record<string, string>) => string,
): AqlErrorDetail | null {
  const evaluated = evaluateQuerySource(source);
  if (evaluated.success === true) return null;
  if (evaluated.kind === 'unresolved-params') {
    const paramList = evaluated.unresolvedParams ?? [];
    return {
      type: 'compile-error',
      message: t(
        'Unresolved parameter{{suffix}}: {{params}}. Select a time range to provide values for these parameters.',
        {
          suffix: paramList.length > 1 ? 's' : '',
          params: paramList.join(', '),
        },
      ),
    };
  }
  return {
    type: 'compile-error',
    message: t('Invalid query syntax'),
  };
}

export function useMultiQueryReport(
  querySources: (string | null)[],
  timeFrame?: TimeFrame,
  mergeKey?: string,
): UseMultiQueryReportResult {
  const { t } = useTranslation();
  const [results, setResults] = useState<QueryResult[]>([]);
  const [merged, setMerged] = useState<QueryResult | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [perQueryErrors, setPerQueryErrors] = useState<
    (AqlErrorDetail | null)[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sourcesKey = querySources.join('|||');

  useEffect(() => {
    const validSources = querySources.filter(
      (s): s is string => s !== null && s !== '',
    );

    if (validSources.length === 0) {
      setResults([]);
      setMerged(null);
      setMergeError(null);
      setPerQueryErrors([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMergeError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const params = resolveTimeFrameParams(timeFrame);
      const resolvedSources = validSources.map(s =>
        applyQueryParams(s, params),
      );

      const compileErrors = resolvedSources.map(source =>
        getCompileError(source, t),
      );
      setPerQueryErrors(compileErrors);

      const hasCompileErrors = compileErrors.some(e => e !== null);
      if (hasCompileErrors) {
        setResults([]);
        setMerged(null);
        setIsLoading(false);
        return;
      }

      try {
        const evaluations = resolvedSources.map(s => evaluateQuerySource(s));

        const queries = evaluations.map((e, i) => {
          if (e.success) return e.query;
          return null;
        });

        const validQueries = queries.filter(
          (q): q is NonNullable<typeof q> => q !== null,
        );

        if (validQueries.length === 0) {
          setResults([]);
          setMerged(null);
          setIsLoading(false);
          return;
        }

        const rawResults = await Promise.all(
          validQueries.map(q => aqlQuery(q)),
        );

        const processedResults: QueryResult[] = rawResults.map((raw, i) =>
          processQueryResult(
            raw.data,
            raw.columns,
            validQueries[i].state.calculation,
          ),
        );

        setResults(processedResults);

        if (processedResults.length === 0) {
          setMerged(null);
        } else if (processedResults.length === 1) {
          setMerged(processedResults[0]);
        } else {
          const mergeResult = mergeQueryResults(processedResults, {
            mergeKey,
          });

          if ('type' in mergeResult) {
            setMergeError(mergeResult.message);
            const firstValid = processedResults.find(r => r.rows.length > 0);
            setMerged(firstValid ?? processedResults[0]);
          } else {
            setMergeError(null);
            setMerged(mergeResult.result);
          }
        }
      } catch (e) {
        const newErrors = [...compileErrors];
        if (e instanceof AqlQueryError) {
          const firstErrorIndex = newErrors.findIndex(e => e === null);
          if (firstErrorIndex >= 0) {
            newErrors[firstErrorIndex] = e.detail;
          }
        } else if (e instanceof Error) {
          const firstErrorIndex = newErrors.findIndex(e => e === null);
          if (firstErrorIndex >= 0) {
            newErrors[firstErrorIndex] = {
              type: 'runtime-error',
              message: e.message,
            };
          }
        }
        setPerQueryErrors(newErrors);
        setResults([]);
        setMerged(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey, timeFrame, mergeKey, t]);

  return { results, merged, mergeError, perQueryErrors, isLoading };
}
