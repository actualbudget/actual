import { useCallback, type Ref, type RefCallback, type RefObject } from 'react';

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
        } else if (ref != null) {
          ref.current = value;
        }
      });
    },
    [refs],
  );
}
