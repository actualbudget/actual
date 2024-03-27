import { useRef } from 'react';

export function useInitialMount(): boolean {
  const initial = useRef(true);

  if (initial.current) {
    initial.current = false;
    return true;
  }

  return false;
}
