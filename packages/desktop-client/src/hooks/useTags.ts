import { useQuery } from '@tanstack/react-query';

import { tagQueries } from '@desktop-client/tags/queries';

export function useTags() {
  return useQuery(tagQueries.list());
}
