import { useCallback } from 'react';

import { useNavigate } from './useNavigate';

// React Router stores the position of each entry in `history.state.idx`;
// 0 means this is the first page the app opened in this tab
export function hasPreviousHistoryEntry(state: unknown): boolean {
  return (
    state != null &&
    typeof state === 'object' &&
    'idx' in state &&
    typeof state.idx === 'number' &&
    state.idx > 0
  );
}

/**
 * Go back a page, or to `fallbackPath` when there is no earlier page to go
 * back to (e.g. the page was opened directly as the mobile start page).
 */
export function useNavigateBack(fallbackPath = '/budget') {
  const navigate = useNavigate();

  return useCallback(() => {
    if (hasPreviousHistoryEntry(window.history.state)) {
      void navigate(-1);
    } else {
      void navigate(fallbackPath, { replace: true });
    }
  }, [navigate, fallbackPath]);
}
