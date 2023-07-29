import { useRef, useLayoutEffect, useCallback } from 'react';

type UseStableCallbackArg = (...args: unknown[]) => unknown;

export default function useStableCallback(callback: UseStableCallbackArg) {
  const callbackRef = useRef<UseStableCallbackArg>();
  const memoCallback = useCallback(
    (...args) => callbackRef.current && callbackRef.current(...args),
    [],
  );
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  return memoCallback;
}
