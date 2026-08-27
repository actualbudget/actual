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
      staleTime: SIX_HOURS,
      gcTime: Infinity,
      retry: 1,
    }),
};
