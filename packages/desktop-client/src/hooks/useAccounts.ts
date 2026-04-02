import { useQuery } from '@tanstack/react-query';

import type { AccountEntity } from 'loot-core/types/models';

import { accountQueries } from '@desktop-client/accounts';

const emptyAccounts: AccountEntity[] = [];

export function useAccounts() {
  const result = useQuery(accountQueries.list());
  return { ...result, data: result.data ?? emptyAccounts };
}
