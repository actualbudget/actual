import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';

// This ensure pointer events are disconnected before pushing elements on top
// of the event source
export function useModalDispatch(): typeof pushModal {
  const dispatch = useDispatch();
  return useCallback(
    (...args: Parameters<typeof pushModal>) => {
      setTimeout(() => dispatch(pushModal(...args)), 10);
    },
    [dispatch],
  ) as typeof pushModal;
}
