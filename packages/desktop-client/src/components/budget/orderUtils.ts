import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

type GroupWithCats = CategoryGroupEntity & { categories: CategoryEntity[] };

export type SortInfo = {
  id: string;
  groupId?: string;
  targetId: string | null;
};

/**
 * Compute the new per-view category order after moving a category.
 * Returns an array of category ids filtered to only those that belong to viewId.
 */
export function computeViewCategoryNewOrder(
  grouped: Array<CategoryGroupEntity>,
  list: Array<CategoryEntity>,
  sortInfo: SortInfo,
  viewId: string,
  viewMap: Record<string, string[] | undefined>,
): string[] {
  const groups: GroupWithCats[] = (grouped || []).map(g => ({
    ...(g as CategoryGroupEntity),
    categories: Array.isArray(g.categories) ? [...g.categories] : [],
  }));

  // Remove moved category from original group
  for (const g of groups) {
    const idx = g.categories.findIndex(c => c.id === sortInfo.id);
    if (idx !== -1) {
      g.categories.splice(idx, 1);
      break;
    }
  }

  // Insert into target group at position before targetId or at start
  const targetGroup = groups.find(g => g.id === sortInfo.groupId);
  if (targetGroup) {
    if (sortInfo.targetId) {
      const tIdx = targetGroup.categories.findIndex(
        c => c.id === sortInfo.targetId,
      );
      const insertIdx = tIdx === -1 ? 0 : tIdx;
      const moved = list.find(c => c.id === sortInfo.id);
      if (moved) {
        targetGroup.categories.splice(insertIdx, 0, moved);
      }
    } else {
      const moved = list.find(c => c.id === sortInfo.id);
      if (moved) {
        targetGroup.categories.splice(0, 0, moved);
      }
    }
  }

  const flattened = groups.flatMap(g => g.categories.map(c => c.id));
  return flattened.filter(id =>
    Array.isArray(viewMap[id]) ? viewMap[id]!.includes(viewId) : false,
  );
}

/**
 * Compute the new per-view group order after moving a group.
 * Returns an array of group ids filtered to only groups that contain at least one
 * category that belongs to viewId.
 */
export function computeViewGroupNewOrder(
  grouped: Array<CategoryGroupEntity>,
  sortInfo: { id: string; targetId: string | null },
  viewId: string,
  viewMap: Record<string, string[] | undefined>,
): string[] {
  const groups: GroupWithCats[] = (grouped || []).map(g => ({
    ...(g as CategoryGroupEntity),
    categories: Array.isArray(g.categories) ? [...g.categories] : [],
  }));

  const removeIdx = groups.findIndex(g => g.id === sortInfo.id);
  let moved: GroupWithCats | null = null;
  if (removeIdx !== -1) {
    moved = groups.splice(removeIdx, 1)[0];
  }

  if (moved) {
    if (sortInfo.targetId) {
      const tIdx = groups.findIndex(g => g.id === sortInfo.targetId);
      const insertIdx = tIdx === -1 ? 0 : tIdx;
      groups.splice(insertIdx, 0, moved);
    } else {
      groups.splice(0, 0, moved);
    }
  }

  const flattened = groups.map(g => g.id);

  return flattened.filter(gid => {
    const g = groups.find(x => x.id === gid);
    return (
      g!.categories.filter(c =>
        Array.isArray(viewMap[c.id]) ? viewMap[c.id]!.includes(viewId) : false,
      ).length > 0
    );
  });
}
