// @ts-strict-ignore
import { useCallback, useMemo, useState } from 'react';

import { type RuleConditionEntity } from 'loot-core/types/models/rule';

export function useFilters<T extends RuleConditionEntity>(
  initialConditions: T[] = [],
) {
  const [conditions, setConditions] = useState<T[]>(initialConditions);
  const [conditionsOp, setConditionsOp] = useState<'and' | 'or'>('and');
  const [saved, setSaved] = useState<T[]>(null);

  const onApply = useCallback(
    conditionsOrSavedFilter => {
      if (conditionsOrSavedFilter === null) {
        setConditions([]);
        setSaved(null);
      } else if (conditionsOrSavedFilter.conditions) {
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

  const onConditionsOpChange = useCallback(
    condOp => {
      setConditionsOp(condOp);
    },
    [setConditionsOp],
  );

  return useMemo(
    () => ({
      conditions,
      saved,
      conditionsOp,
      onApply,
      onUpdate,
      onDelete,
      onConditionsOpChange,
    }),
    [
      conditions,
      saved,
      onApply,
      onUpdate,
      onDelete,
      onConditionsOpChange,
      conditionsOp,
    ],
  );
}
