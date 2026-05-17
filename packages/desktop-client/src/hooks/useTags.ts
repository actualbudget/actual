import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Fzf } from 'fzf';

import { tagQueries } from '#tags/queries';

export function useTags() {
  return useQuery(tagQueries.list());
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
    })
      .find(filterStr.replace(/^#/, ''))
      .map(item => item.item);
  }, [tags, filterStr, requireHashInFilter]);
  return {
    data: filteredTags,
    ...rest,
  };
}
