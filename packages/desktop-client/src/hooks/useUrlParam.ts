import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Hook to get and set a specific URL search parameter value
 */
export function useUrlParam(name: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const setParam = useCallback(
    (value: string) => {
      setSearchParams({ [name]: value });
    },
    [name, setSearchParams],
  );

  return [searchParams.get(name), setParam] as const;
}
