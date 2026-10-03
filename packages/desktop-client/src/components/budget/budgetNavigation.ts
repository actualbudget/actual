import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

type BudgetNavigationRow =
  | { id: CategoryGroupEntity['id']; isGroup: true }
  | CategoryEntity;

function flattenBudgetRows(
  categoryGroups: CategoryGroupEntity[],
  collapsedGroupIds: string[],
  showHiddenCategories: boolean,
) {
  const shouldShowHiddenCategories = Boolean(showHiddenCategories);

  return categoryGroups.reduce((all, group) => {
    if (group.is_income) {
      return all.concat(
        { id: group.id, isGroup: true } as BudgetNavigationRow,
        ...((collapsedGroupIds.includes(group.id)
          ? []
          : (group.categories || []).filter(
              cat => shouldShowHiddenCategories || !cat.hidden,
            )) as BudgetNavigationRow[]),
      );
    }

    if (group.hidden && !shouldShowHiddenCategories) {
      return all;
    }

    if (collapsedGroupIds.includes(group.id)) {
      return all.concat({ id: group.id, isGroup: true });
    }

    return all.concat([
      { id: group.id, isGroup: true } as BudgetNavigationRow,
      ...((group?.categories || []).filter(
        cat => shouldShowHiddenCategories || !cat.hidden,
      ) as BudgetNavigationRow[]),
    ]);
  }, [] as BudgetNavigationRow[]);
}

export function findNextBudgetCell(
  categoryGroups: CategoryGroupEntity[],
  collapsedGroupIds: string[],
  showHiddenCategories: boolean,
  currentCell: { id: string; cell: string },
  type: string,
  dir: 1 | -1,
) {
  const flattened = flattenBudgetRows(
    categoryGroups,
    collapsedGroupIds,
    showHiddenCategories,
  );
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
