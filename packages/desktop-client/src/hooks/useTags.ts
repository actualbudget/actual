import { useMemo } from 'react';

import type { TagEntity } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';
import { byLengthAsc, byStartAsc, Fzf } from 'fzf';

import { tagQueries } from '#tags/queries';

import { useSyncedPref } from './useSyncedPref';

export function useTags() {
  const [showHiddenTags] = useSyncedPref('show-hidden-tags');
  return useQuery({
    ...tagQueries.list(),
    select: data => {
      return showHiddenTags === 'true' ? data : data.filter(tag => !tag.hidden);
    },
  });
}

export function filterTags<T extends TagEntity>(
  tags: T[],
  filterStr: string,
): T[] {
  return new Fzf(tags as TagEntity[], {
    selector: tag => tag.tag,
    limit: 100,
    tiebreakers: [byLengthAsc, byStartAsc],
  })
    .find(filterStr.replace(/^#/, ''))
    .map(item => item.item as T);
}

export function useFilteredTags(
  filterStr: string,
  requireHashInFilter?: boolean,
) {
  const { data: tags, ...rest } = useTags();
  const filteredTags = useMemo(() => {
    if (!filterStr || !tags) return [];
    if (requireHashInFilter && !filterStr.startsWith('#')) return [];
    return new Fzf(tags, {
      selector: tag => tag.tag,
      limit: 100,
      tiebreakers: [byLengthAsc, byStartAsc],
    })
      .find(filterStr.replace(/^#/, ''))
      .map(item => item.item);
  }, [tags, filterStr, requireHashInFilter]);
  return {
    data: filteredTags,
    ...rest,
  };
}
