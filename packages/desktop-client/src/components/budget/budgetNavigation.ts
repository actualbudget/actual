import type { CategoryEntity, CategoryGroupEntity } from '@actual-app/core/types/models';

type BudgetNavigationRow =
  | { id: CategoryGroupEntity['id']; isGroup: true }
  | CategoryEntity;

function flattenBudgetRows(
  categoryGroups: CategoryGroupEntity[],
  collapsedGroupIds: string[],
) {
  return categoryGroups.reduce((all, group) => {
    if (collapsedGroupIds.includes(group.id)) {
      return all.concat({ id: group.id, isGroup: true });
    }

    return all.concat([
      { id: group.id, isGroup: true } as BudgetNavigationRow,
      ...((group?.categories || []) as BudgetNavigationRow[]),
    ]);
  }, [] as BudgetNavigationRow[]);
}

export function findNextBudgetCell(
  categoryGroups: CategoryGroupEntity[],
  collapsedGroupIds: string[],
  currentCell: { id: string; cell: string },
  type: string,
  dir: 1 | -1,
) {
  const flattened = flattenBudgetRows(categoryGroups, collapsedGroupIds);
  const idx = flattened.findIndex(item => item.id === currentCell.id);
  let nextIdx = idx + dir;

  while (nextIdx >= 0 && nextIdx < flattened.length) {
    const next = flattened[nextIdx];

    if ('isGroup' in next && next.isGroup) {
      nextIdx += dir;
      continue;
    }

    const nextCategory = next as CategoryEntity;

    if (type === 'tracking' || !nextCategory.is_income) {
      return {
        id: nextCategory.id,
        cell: currentCell.cell,
      };
    }

    break;
  }

  return null;
}
