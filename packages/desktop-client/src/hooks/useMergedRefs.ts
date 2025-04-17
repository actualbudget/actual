import { useCallback, type RefObject, type Ref, type RefCallback } from 'react';

export function useMergedRefs<T>(
  ...refs: (
    | RefCallback<T | null | undefined>
    | RefObject<T | null | undefined>
    | Ref<T | null | undefined>
    | null
    | undefined
  )[]
): Ref<T> {
  return useCallback(
    (value: T) => {
      [...refs].forEach(ref => {
        if (typeof ref === 'function') {
          ref(value);
        } else if (ref != null && 'current' in ref) {
          (ref as RefObject<T>).current = value;
        }
      });
    },
    [refs],
  );
}
