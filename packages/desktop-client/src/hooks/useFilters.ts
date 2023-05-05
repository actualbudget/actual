import { useCallback, useMemo, useState } from 'react';

export default function useFilters<T>(initialFilters: T[] = []) {
  const [filters, setFilters] = useState<T[]>(initialFilters);

  const onApply = useCallback(
    (newFilter: T) => {
      setFilters(state => [...state, newFilter]);
    },
    [setFilters],
  );

  const onUpdate = useCallback(
    (oldFilter: T, updatedFilter: T) => {
      setFilters(state =>
        state.map(f => (f === oldFilter ? updatedFilter : f)),
      );
    },
    [setFilters],
  );

  const onDelete = useCallback(
    (deletedFilter: T) => {
      setFilters(state => state.filter(f => f !== deletedFilter));
    },
    [setFilters],
  );

  return useMemo(
    () => ({
      filters,
      onApply,
      onUpdate,
      onDelete,
    }),
    [filters, onApply, onUpdate, onDelete],
  );
}
