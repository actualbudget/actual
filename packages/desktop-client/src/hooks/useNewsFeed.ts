import { useQuery } from '@tanstack/react-query';

import { newsQueries } from '#news/queries';
import type { NewsEntry } from '#news/types';
import { getNewestDate, getUnseenEntries } from '#news/utils';

import { useFeatureFlag } from './useFeatureFlag';
import { useGlobalPref } from './useGlobalPref';

const EMPTY_ENTRIES: NewsEntry[] = [];

export function useNewsFeed() {
  const isEnabled = useFeatureFlag('newsFeed');
  const [lastSeenNewsDate, setLastSeenNewsDate] =
    useGlobalPref('lastSeenNewsDate');

  // `enabled: false` means no request is ever made while the flag is off.
  const query = useQuery({ ...newsQueries.feed(), enabled: isEnabled });
  const entries = query.data?.entries ?? EMPTY_ENTRIES;
  const unseenCount = getUnseenEntries(entries, lastSeenNewsDate).length;

  const markAllSeen = () => {
    const newestDate = getNewestDate(entries);
    if (newestDate && newestDate !== lastSeenNewsDate) {
      setLastSeenNewsDate(newestDate);
    }
  };

  return {
    isEnabled,
    entries,
    unseenCount,
    lastSeenNewsDate,
    markAllSeen,
    isLoading: isEnabled && query.isPending,
    error: query.error,
  };
}
