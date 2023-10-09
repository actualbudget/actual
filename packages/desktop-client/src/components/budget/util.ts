import { styles, theme } from '../../style';

type BudgetGroupArgs = {
  categories: object[];
  hidden: number;
  id: string;
  is_income: number;
  name: string;
  sort_order: number;
  tombstone: number;
};

export function addToBeBudgetedGroup(groups: BudgetGroupArgs[]) {
  return [
    {
      id: 'to-be-budgeted',
      name: 'To Be Budgeted',
      categories: [{ id: 'to-be-budgeted', name: 'To Be Budgeted' }],
    },
    ...groups,
  ];
}

export function separateGroups(categoryGroups: BudgetGroupArgs[]) {
  return [
    categoryGroups.filter(g => !g.is_income),
    categoryGroups.find(g => g.is_income),
  ];
}

export function makeAmountGrey(value: number | string) {
  return value === 0 || value === '0' || value === ''
    ? { color: theme.altMenuItemText }
    : null;
}

export function makeAmountStyle(value: number) {
  const greyed = makeAmountGrey(value);
  if (greyed) {
    return greyed;
  }

  if (value < 0) {
    return { color: theme.errorText };
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

type CatagroryGroupArrArgs = {
  cat_group: string;
  hidden: number;
  id: string;
  is_income: number;
  name: string;
  sort_order: number;
  tombstone: number;
};

export function findSortDown(
  arr: CatagroryGroupArrArgs[],
  pos: string,
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
  arr: CatagroryGroupArrArgs[],
  pos: string,
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