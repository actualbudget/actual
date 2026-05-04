import { useMemo } from 'react';
import { useFilter } from 'react-aria-components';

import { useQuery } from '@tanstack/react-query';

import { tagQueries } from '#tags/queries';

export function useTags() {
  return useQuery(tagQueries.list());
}

export function useFilteredTags(filterStr: string, includeHash?: boolean) {
  const { data: tags } = useTags();
  const { contains, startsWith } = useFilter({ sensitivity: 'base' });
  const filteredTags = useMemo(() => {
    if (!filterStr || !tags) return [];

    if (includeHash && filterStr.charAt(0) !== '#') return [];

    const substr = includeHash ? filterStr.slice(1) : filterStr;

    const filteredTags = tags.filter(tag => contains(tag.tag, substr));
    filteredTags.sort((a, b) => {
      const aStartsWith = startsWith(a.tag, substr);
      const bStartsWith = startsWith(b.tag, substr);

      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;
      return 0;
    });
    return filteredTags.slice(0, 10);
  }, [tags, filterStr, includeHash, contains, startsWith]);
  return filteredTags;
}
