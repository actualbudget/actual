import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { byLengthAsc, byStartAsc, Fzf } from 'fzf';
import type { TagEntity } from '@actual-app/core/types/models';

import { tagQueries } from '#tags/queries';

export function useTags() {
  return useQuery(tagQueries.list());
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
