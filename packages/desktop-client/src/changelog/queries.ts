import { send } from '@actual-app/core/platform/client/connection';
import type { ChangeLogResult } from '@actual-app/core/server/changelog/types';
import { infiniteQueryOptions } from '@tanstack/react-query';

/** Grouped changes requested per page. */
const PAGE_SIZE = 100;

export const changeLogQueries = {
  all: () => ['changelog'],
  lists: () => [...changeLogQueries.all(), 'lists'],
  list: () =>
    infiniteQueryOptions<
      ChangeLogResult,
      Error,
      ChangeLogResult[],
      string[],
      string | null
    >({
      queryKey: [...changeLogQueries.lists()],
      queryFn: ({ pageParam }) =>
        send('changelog-get', { cursor: pageParam, limit: PAGE_SIZE }),
      initialPageParam: null,
      // A page with no entries but a cursor is normal: the server cannot
      // filter by dataset, so a page may hold nothing but other tables'
      // changes. Keep following the cursor until it runs out.
      getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
      select: data => data.pages,
      // Transactions are edited elsewhere in the app, so there is no mutation
      // to invalidate from. Re-read the log whenever the page is opened.
      staleTime: 0,
      refetchOnMount: 'always',
    }),
};
