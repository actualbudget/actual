import { send } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';

export const tagQueries = {
  all: () => ['tags'],
  lists: () => [...tagQueries.all(), 'lists'],
  list: () =>
    queryOptions<TagEntity[]>({
      queryKey: [...tagQueries.lists()],
      queryFn: async () => {
        const tags: TagEntity[] = await send('tags-get');
        return tags;
      },
      placeholderData: [],
      // Manually invalidated when tags change
      staleTime: Infinity,
    }),
};
