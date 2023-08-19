import { useEffect, useRef } from 'react';

export default function usePrevious<T = unknown>(value: T): T | undefined {
  const ref = useRef<T | undefined>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
