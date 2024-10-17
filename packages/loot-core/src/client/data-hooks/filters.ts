// @ts-strict-ignore
import { useCallback, useMemo } from 'react';

import { q } from '../../shared/query';
import { type TransactionFilterEntity } from '../../types/models';
import { useQuery } from '../query-hooks';

function toJS(rows): TransactionFilterEntity[] {
  const filters = rows.map(row => {
    return {
      ...row.fields,
      id: row.id,
      name: row.name,
      tombstone: row.tombstone,
      conditionsOp: row.conditions_op,
      conditions: row.conditions,
    } satisfies TransactionFilterEntity;
  });
  return filters;
}

export function useFilters(): TransactionFilterEntity[] {
  const { data } = useQuery<TransactionFilterEntity>(
    () => q('transaction_filters').select('*'),
    [],
  );

  /** Sort filters by alphabetical order */
  const sort = useCallback((filters: TransactionFilterEntity[]) => {
    return [...filters].sort((a, b) =>
      a.name
        .trim()
        .localeCompare(b.name.trim(), undefined, { ignorePunctuation: true }),
    );
  }, []);

  return useMemo(() => sort(toJS(data ? [...data] : [])), [data, sort]);
}
