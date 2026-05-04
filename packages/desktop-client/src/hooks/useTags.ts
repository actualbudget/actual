import { useMemo } from 'react';
import { useFilter } from 'react-aria-components';

import { useQuery } from '@tanstack/react-query';

import { tagQueries } from '#tags/queries';

export function useTags() {
  return useQuery(tagQueries.list());
}

export function useFilteredTags(filterStr: string, includeHash?: boolean) {
  const { data: tags } = useTags();
  const { contains } = useFilter({ sensitivity: 'base' });
  const filteredTags = useMemo(() => {
    if (!filterStr || !tags) return [];

    if (includeHash && filterStr.charAt(0) !== '#') return [];

    const substr = includeHash ? filterStr.slice(1) : filterStr;
    return tags.filter(tag => contains(tag.tag, substr)).slice(0, 10);
  }, [filterStr, tags, contains, includeHash]);
  return filteredTags;
}
