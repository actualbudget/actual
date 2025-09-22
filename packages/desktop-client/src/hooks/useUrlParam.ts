import { useCallback } from 'react';
import { useSearchParams, type NavigateOptions } from 'react-router';

/**
 * Hook to get and set a specific URL search parameter value
 */
export function useUrlParam(name: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const setParam = useCallback(
    (value: string | null | undefined, opts?: NavigateOptions) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (value == null || value === '') {
          next.delete(name);
        } else {
          next.set(name, value);
        }
        return next;
      }, opts);
    },
    [name, setSearchParams],
  );

  return [searchParams.get(name), setParam] as const;
}
