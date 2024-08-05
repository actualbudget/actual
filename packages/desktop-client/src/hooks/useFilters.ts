import { useCallback, useMemo, useState } from 'react';

import { type RuleConditionEntity } from 'loot-core/types/models/rule';

export function useFilters<T extends RuleConditionEntity>(
  initialConditions: T[] = [],
) {
  const [conditions, setConditions] = useState<T[]>(initialConditions);
  const [conditionsOp, setConditionsOp] = useState<'and' | 'or'>('and');
  const [saved, setSaved] = useState<T[] | null>(null);

  const onApply = useCallback(
    (
      conditionsOrSavedFilter:
        | null
        | { conditions: T[]; conditionsOp: 'and' | 'or'; id: T[] | null }
        | T,
    ) => {
      if (conditionsOrSavedFilter === null) {
        setConditions([]);
        setSaved(null);
      } else if ('conditions' in conditionsOrSavedFilter) {
        setConditions([...conditionsOrSavedFilter.conditions]);
        setConditionsOp(conditionsOrSavedFilter.conditionsOp);
        setSaved(conditionsOrSavedFilter.id);
      } else {
        setConditions(state => [...state, conditionsOrSavedFilter]);
        setSaved(null);
      }
    },
    [setConditions],
  );

  const onUpdate = useCallback(
    (oldFilter: T, updatedFilter: T) => {
      setConditions(state =>
        state.map(f => (f === oldFilter ? updatedFilter : f)),
      );
      setSaved(null);
    },
    [setConditions],
  );

  const onDelete = useCallback(
    (deletedFilter: T) => {
      setConditions(state => state.filter(f => f !== deletedFilter));
      setSaved(null);
    },
    [setConditions],
  );

  return useMemo(
    () => ({
      conditions,
      saved,
      conditionsOp,
      onApply,
      onUpdate,
      onDelete,
      onConditionsOpChange: setConditionsOp,
    }),
    [
      conditions,
      saved,
      onApply,
      onUpdate,
      onDelete,
      setConditionsOp,
      conditionsOp,
    ],
  );
}
