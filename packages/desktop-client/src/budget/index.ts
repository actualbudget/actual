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
    queryOptions<CategoryViews>({
      queryKey: [...categoryQueries.lists()],
      queryFn: async () => {
        const categories = await send('get-categories');
        return translateStartingBalances(categories, t);
      },
      placeholderData: {
        grouped: [],
        list: [],
      },
      // Manually invalidated when categories change
      staleTime: Infinity,
    }),
};

function translateStartingBalances(
  categories: { grouped: CategoryGroupEntity[]; list: CategoryEntity[] },
  t: i18n['t'],
): CategoryViews {
  return {
    list: translateStartingBalancesCategories(categories.list, t) ?? [],
    grouped: categories.grouped.map(group => ({
      ...group,
      categories: translateStartingBalancesCategories(group.categories, t),
    })),
  };
}

function translateStartingBalancesCategories(
  categories: CategoryEntity[] | undefined,
  t: i18n['t'],
): CategoryEntity[] | undefined {
  return categories
    ? categories.map(cat => translateStartingBalancesCategory(cat, t))
    : undefined;
}

function translateStartingBalancesCategory(
  category: CategoryEntity,
  t: i18n['t'],
): CategoryEntity {
  return {
    ...category,
    name:
      category.name?.toLowerCase() === 'starting balances'
        ? t('Starting Balances')
        : category.name,
  };
}
