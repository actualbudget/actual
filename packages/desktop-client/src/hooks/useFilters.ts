import { useCallback, useMemo, useState } from 'react';

export default function useFilters<T>(initialFilters: T[] = []) {
  const [filters, setFilters] = useState<T[]>(initialFilters);
  const [saved, setSaved] = useState<T[]>(null);

  const onApply = useCallback(
    newFilter => {
      if (newFilter.conditions) {
        setFilters([...newFilter.conditions]);
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

  return useMemo(
    () => ({
      filters,
      saved,
      onApply,
      onUpdate,
      onDelete,
    }),
    [filters, saved, onApply, onUpdate, onDelete],
  );
}
