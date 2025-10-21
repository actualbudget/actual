import { queryOptions } from '@tanstack/react-query';
import { type i18n } from 'i18next';

import { send } from 'loot-core/platform/client/fetch';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

type CategoryViews = {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
};

export const categoryQueries = {
  all: () => ['categories'],
  lists: () => [...categoryQueries.all(), 'lists'],
  list: ({ t }: { t: i18n['t'] }) =>
    queryOptions({
      queryKey: [...categoryQueries.lists()],
      queryFn: async () => {
        const categories: CategoryViews = await send('get-categories');
        return {
          list: translateStartingBalancesCategories(t, categories.list),
          grouped: categories.grouped.map(group => ({
            ...group,
            categories: translateStartingBalancesCategories(
              t,
              group.categories,
            ),
          })),
        };
      },
      placeholderData: {
        grouped: [],
        list: [],
      },
      // Manually invalidated when categories change
      staleTime: Infinity,
    }),
};

function translateStartingBalancesCategories(
  t: i18n['t'],
  categories: CategoryEntity[],
): CategoryEntity[] {
  return categories.map(cat => translateStartingBalancesCategory(t, cat));
}

function translateStartingBalancesCategory(
  t: i18n['t'],
  category: CategoryEntity | null,
): CategoryEntity | null {
  if (!category) {
    return category;
  }

  return {
    ...category,
    name:
      category.name?.toLowerCase() === 'starting balances'
        ? t('Starting Balances')
        : category.name,
  };
}
