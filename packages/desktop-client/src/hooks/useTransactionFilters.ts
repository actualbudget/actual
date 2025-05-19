// @ts-strict-ignore
import { useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import { type TransactionFilterEntity } from 'loot-core/types/models';

import { useQuery } from './useQuery';

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

export function useTransactionFilters(): TransactionFilterEntity[] {
  const { data } = useQuery<TransactionFilterEntity>(
    () => q('transaction_filters').select('*'),
    [],
  );

  return useMemo(
    () =>
      toJS(data ? [...data] : []).sort((a, b) =>
        a.name
          .trim()
          .localeCompare(b.name.trim(), undefined, { ignorePunctuation: true }),
      ),
    [data],
  );
}
