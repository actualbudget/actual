import { type CategoryGroupEntity } from 'loot-core/src/types/models';

import { styles, theme } from '../../style';
import { type DropPosition } from '../sort';

export function addToBeBudgetedGroup(groups: CategoryGroupEntity[]) {
  return [
    {
      id: 'to-be-budgeted',
      name: 'To Be Budgeted',
      categories: [
        {
          id: 'to-be-budgeted',
          name: 'To Be Budgeted',
          cat_group: 'to-be-budgeted',
          group: {
            id: 'to-be-budgeted',
            name: 'To Be Budgeted',
          },
        },
      ],
    },
    ...groups,
  ];
}

export function separateGroups(categoryGroups: CategoryGroupEntity[]) {
  return [
    categoryGroups.filter(g => !g.is_income),
    categoryGroups.find(g => g.is_income),
  ];
}

export function makeAmountGrey(value: number | string) {
  return value === 0 || value === '0' || value === '' || value == null
    ? { color: theme.altMenuItemText }
    : null;
}

export function makeAmountStyle(
  value: number,
  goalValue: number,
  budgetedValue: number,
) {
  let goalStatus = goalValue != null ? budgetedValue >= goalValue : null;
  if (value < 0) {
    return { color: theme.errorText };
  }

  if (goalStatus === null) {
    const greyed = makeAmountGrey(value);
    if (greyed) {
      return greyed;
    }
  } else {
    if (!goalStatus) {
      return { color: theme.warningText };
    }
    return { color: theme.noticeText };
  }
}

export function makeAmountFullStyle(value: number) {
  return {
    color:
      value < 0
        ? theme.errorText
        : value === 0
        ? theme.altMenuItemText
        : theme.noticeText,
  };
}

export function findSortDown(
  arr: CategoryGroupEntity[],
  pos: DropPosition,
  targetId: string,
) {
  if (pos === 'top') {
    return { targetId };
  } else {
    let idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    let newIdx = idx + 1;
    if (newIdx < arr.length - 1) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the end
      return { targetId: null };
    }
  }
}

export function findSortUp(
  arr: CategoryGroupEntity[],
  pos: DropPosition,
  targetId: string,
) {
  if (pos === 'bottom') {
    return { targetId };
  } else {
    let idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    let newIdx = idx - 1;
    if (newIdx >= 0) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the beginning
      return { targetId: null };
    }
  }
}

export function getScrollbarWidth() {
  return Math.max(styles.scrollbarWidth - 2, 0);
}
