import { useCallback } from 'react';
import type { MutableRefObject, Ref, RefCallback } from 'react';

export function useMergedRefs<T>(
  ...refs: (RefCallback<T> | MutableRefObject<T> | Ref<T> | null | undefined)[]
): Ref<T> {
  return useCallback(
    (value: T) => {
      [...refs].forEach(ref => {
        if (typeof ref === 'function') {
          ref(value);
        } else if (ref != null && 'current' in ref) {
          (ref as MutableRefObject<T>).current = value;
        }
      });
    },
    [refs],
  );
}
