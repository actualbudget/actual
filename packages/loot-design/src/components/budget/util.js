import React from 'react';

import { colors } from '../../style';

export let CategoryGroupsContext = React.createContext([]);

export function addToBeBudgetedGroup(groups) {
  return [
    {
      id: 'to-be-budgeted',
      name: 'To Be Budgeted',
      categories: [{ id: 'to-be-budgeted', name: 'To Be Budgeted' }]
    },
    ...groups
  ];
}

export function separateGroups(categoryGroups) {
  return [
    categoryGroups.filter(g => !g.is_income),
    categoryGroups.find(g => g.is_income)
  ];
}

export function makeAmountGrey(value) {
  return value === 0 || value === '0' || value === ''
    ? { color: colors.n10 }
    : null;
}

export function makeAmountStyle(value) {
  const greyed = makeAmountGrey(value);
  if (greyed) {
    return greyed;
  }

  if (value < 0) {
    return { color: colors.r4 };
  }
}

export function makeAmountFullStyle(value) {
  return {
    color: value < 0 ? colors.r4 : value === 0 ? colors.n10 : colors.g4
  };
}

export function findSortDown(arr, pos, targetId) {
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

export function findSortUp(arr, pos, targetId) {
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
