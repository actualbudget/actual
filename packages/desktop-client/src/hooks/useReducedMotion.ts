import { useSyncExternalStore } from 'react';

import { useIsTestEnv } from './useIsTestEnv';

const QUERY = '(prefers-reduced-motion: reduce)';

function canMatchMedia() {
  return (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  );
}

function subscribe(callback: () => void) {
  if (!canMatchMedia()) {
    return () => undefined;
  }
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot() {
  return canMatchMedia() && window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const isTestEnv = useIsTestEnv();
  const prefersReduced = useSyncExternalStore(subscribe, getSnapshot);
  return isTestEnv || prefersReduced;
}
