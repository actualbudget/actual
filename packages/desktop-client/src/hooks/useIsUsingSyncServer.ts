import { useIsTestEnv } from './useIsTestEnv';
import { useSyncServerStatus } from './useSyncServerStatus';

// Bank Sync is only meaningful once a sync server is configured; treat the
// test environment as "using a server" so it stays testable in Playwright.
export function useIsUsingSyncServer(): boolean {
  const syncServerStatus = useSyncServerStatus();
  const isTestEnv = useIsTestEnv();
  return syncServerStatus !== 'no-server' || isTestEnv;
}
