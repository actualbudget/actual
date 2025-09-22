import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Hook to get and set a specific URL search parameter value
 */
export function useUrlParam(name: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const setParam = useCallback(
    (value: string | null | undefined, opts?: { replace?: boolean }) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (value == null || value === '') {
            next.delete(name);
          } else {
            next.set(name, value);
          }
          return next;
        },
        opts?.replace ? { replace: true } : undefined,
      );
    },
    [name, setSearchParams],
  );

  return [searchParams.get(name), setParam] as const;
}
