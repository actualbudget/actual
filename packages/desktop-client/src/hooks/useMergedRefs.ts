// @ts-strict-ignore
import { useMemo } from 'react';
import type { MutableRefObject, Ref, RefCallback } from 'react';

export function useMergedRefs<T>(
  ref1: RefCallback<T> | MutableRefObject<T>,
  ref2: RefCallback<T> | MutableRefObject<T>,
): Ref<T> {
  return useMemo(() => {
    function ref(value) {
      [ref1, ref2].forEach(ref => {
        if (typeof ref === 'function') {
          ref(value);
        } else if (ref != null) {
          ref.current = value;
        }
      });
    }

    return ref;
  }, [ref1, ref2]);
}
