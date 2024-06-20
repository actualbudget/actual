// @ts-strict-ignore
import { useCallback, useMemo, useState } from 'react';

import { type RuleConditionEntity } from 'loot-core/types/models/rule';

export function useFilters<T extends RuleConditionEntity>(
  initialFilters: T[] = [],
) {
  const [filters, setFilters] = useState<T[]>(initialFilters);
  const [conditionsOp, setConditionsOp] = useState<'and' | 'or'>('and');
  const [saved, setSaved] = useState<T[]>(null);

  const onApply = useCallback(
    newFilter => {
      if (newFilter === null) {
        setFilters([]);
        setSaved(null);
      } else if (newFilter.conditions) {
        setFilters([...newFilter.conditions]);
        setConditionsOp(newFilter.conditionsOp);
        setSaved(newFilter.id);
      } else {
        setFilters(state => [...state, newFilter]);
        setSaved(null);
      }
    },
    [setFilters],
  );

  const onUpdate = useCallback(
    (oldFilter: T, updatedFilter: T) => {
      setFilters(state =>
        state.map(f => (f === oldFilter ? updatedFilter : f)),
      );
      setSaved(null);
    },
    [setFilters],
  );

  const onDelete = useCallback(
    (deletedFilter: T) => {
      setFilters(state => state.filter(f => f !== deletedFilter));
      setSaved(null);
    },
    [setFilters],
  );

  const onCondOpChange = useCallback(
    condOp => {
      setConditionsOp(condOp);
    },
    [setConditionsOp],
  );

  return useMemo(
    () => ({
      filters,
      saved,
      conditionsOp,
      onApply,
      onUpdate,
      onDelete,
      onCondOpChange,
    }),
    [filters, saved, onApply, onUpdate, onDelete, onCondOpChange, conditionsOp],
  );
}
