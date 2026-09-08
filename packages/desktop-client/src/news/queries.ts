import { queryOptions } from '@tanstack/react-query';

import { fetchNewsFeed } from './fetchNewsFeed';
import type { NewsFeed } from './types';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export const newsQueries = {
  all: () => ['news'],
  feed: () =>
    queryOptions<NewsFeed>({
      queryKey: [...newsQueries.all(), 'feed'],
      queryFn: fetchNewsFeed,
      // News changes rarely; one request per session is plenty.
      staleTime: SIX_HOURS,
      // Keep the feed cached after the page unmounts so the titlebar bell
      // doesn't trigger a refetch on every navigation.
      gcTime: Infinity,
      // Being offline is a normal state for a local-first app, not an error worth retrying repeatedly.
      retry: 1,
    }),
};
