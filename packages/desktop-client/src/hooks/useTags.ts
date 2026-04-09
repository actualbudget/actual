import { useQuery } from '@tanstack/react-query';

import { tagQueries } from '#tags/queries';

export function useTags() {
  return useQuery(tagQueries.list());
}
