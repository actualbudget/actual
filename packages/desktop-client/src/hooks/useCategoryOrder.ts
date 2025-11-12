import { useMemo } from 'react';

import { type ViewCategoryOrder } from './useBudgetViews';

/**
 * Returns the correct category order based on context.
 * If a viewId is provided and has a custom order, returns that.
 * Otherwise, returns the global order (unchanged from categories table sort_order).
 *
 * Usage:
 *   const order = useCategoryOrder(categories, viewId, viewCategoryOrder);
 *   const sortedCategories = categories.sort((a, b) =>
 *     order.indexOf(a.id) - order.indexOf(b.id)
 *   );
 */
export function useCategoryOrder(
  categories: Array<{ id: string }>,
  viewId: string | null | undefined,
  viewCategoryOrder: ViewCategoryOrder,
): string[] {
  return useMemo(() => {
    // If viewing a specific budget view and it has custom ordering
    if (viewId && viewCategoryOrder[viewId]) {
      return viewCategoryOrder[viewId];
    }

    // Otherwise return global order (category IDs in their original sort_order)
    return categories.map(cat => cat.id);
  }, [categories, viewId, viewCategoryOrder]);
}

/**
 * Sorts an array of categories by the given order.
 * Categories not in the order are appended at the end.
 */
export function sortCategoriesByOrder<T extends { id: string }>(
  categories: T[],
  order: string[],
): T[] {
  const orderMap = new Map(order.map((id, idx) => [id, idx]));
  return [...categories].sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? order.length;
    const bIndex = orderMap.get(b.id) ?? order.length;
    return aIndex - bIndex;
  });
}

/**
 * Sorts an array of groups (objects with `id`) by the given order of ids.
 * Groups not in the order are appended at the end.
 */
export function sortGroupsByOrder<T extends { id: string }>(
  groups: T[],
  order: string[],
): T[] {
  const orderMap = new Map(order.map((id, idx) => [id, idx]));
  return [...groups].sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? order.length;
    const bIndex = orderMap.get(b.id) ?? order.length;
    return aIndex - bIndex;
  });
}
