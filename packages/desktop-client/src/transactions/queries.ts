import { infiniteQueryOptions, keepPreviousData } from '@tanstack/react-query';

import type { Query } from 'loot-core/shared/query';
import type { TransactionEntity } from 'loot-core/types/models';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export const transactionQueries = {
  all: () => ['transactions'],
  aql: ({ query, pageSize = 50 }: { query?: Query; pageSize?: number }) =>
    infiniteQueryOptions<TransactionEntity[]>({
      queryKey: [...transactionQueries.all(), 'aql', query, pageSize],
      queryFn: async ({ pageParam }) => {
        if (!query) {
          // Shouldn't happen because of the enabled flag, but needed to satisfy TS
          throw new Error('No query provided.');
        }
        const queryWithOffset = query
          .offset((pageParam as number) * pageSize)
          .limit(pageSize);

        const { data }: { data: TransactionEntity[] } =
          await aqlQuery(queryWithOffset);
        return data;
      },
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        return lastPage.length < pageSize ? undefined : pages.length;
      },
      enabled: !!query,
    }),
};
