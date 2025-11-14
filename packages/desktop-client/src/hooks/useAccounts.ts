import { useAccountsQuery } from './useAccountsQuery';

export function useAccounts() {
  const query = useAccountsQuery();
  // TODO: Update to return query states (e.g. isFetching, isError, etc)
  // so clients can handle loading and error states appropriately.
  return query.data ?? [];
}
