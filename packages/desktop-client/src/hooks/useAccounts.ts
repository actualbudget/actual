import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useAccounts() {
  const query = useQuery(accountQueries.list());
  // TODO: Update to return query states (e.g. isFetching, isError, etc)
  // so clients can handle loading and error states appropriately.
  return query.data ?? [];
}
