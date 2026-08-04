import { send } from '@actual-app/core/platform/client/connection';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';
import i18n from 'i18next';

type CategoryViews = {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
};

/**
 * Exact English names from demo / default-db seeds.
 * Display-layer only — stored names stay English; custom renames are untouched.
 */
const DEFAULT_CATEGORY_DISPLAY_NAMES = new Set(
  [
    'Starting Balances',
    'Usual Expenses',
    'Food',
    'Restaurants',
    'Entertainment',
    'Clothing',
    'General',
    'Gift',
    'Medical',
    'Savings',
    'Bills',
    'Cell',
    'Internet',
    'Mortgage',
    'Water',
    'Power',
    'Income',
    'Misc',
  ].map(n => n.toLowerCase()),
);

export const categoryQueries = {
  all: () => ['categories'],
  lists: () => [...categoryQueries.all(), 'lists'],
  list: () =>
    queryOptions<CategoryViews>({
      queryKey: [...categoryQueries.lists()],
      queryFn: async () => {
        const categories = await send('get-categories');
        return translateDefaultCategoryNames(categories);
      },
      placeholderData: {
        grouped: [],
        list: [],
      },
      // Manually invalidated when categories change
      staleTime: Infinity,
    }),
};

function translateDefaultCategoryNames(categories: {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
}): CategoryViews {
  return {
    list: translateCategoryList(categories.list) ?? [],
    grouped: categories.grouped.map(group => ({
      ...group,
      name: translateDefaultName(group.name),
      categories: translateCategoryList(group.categories),
    })),
  };
}

function translateCategoryList(
  categories: CategoryEntity[] | undefined,
): CategoryEntity[] | undefined {
  return categories
    ? categories.map(cat => ({
        ...cat,
        name: translateDefaultName(cat.name),
      }))
    : undefined;
}

function translateDefaultName(name: string | undefined): string {
  if (!name) {
    return name ?? '';
  }
  if (!DEFAULT_CATEGORY_DISPLAY_NAMES.has(name.toLowerCase())) {
    return name;
  }
  // i18n natural keys match the English seed names exactly
  return i18n.t(name);
}
