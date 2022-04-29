import { useMemo } from 'react';

export function useMergedRefs(ref1, ref2) {
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
