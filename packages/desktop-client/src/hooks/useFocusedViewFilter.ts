import { useEffect, useMemo, useRef, useState } from 'react';

import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { BUILT_IN_VIEWS, useFocusedViews } from './useFocusedViews';
import { useSpreadsheet } from './useSpreadsheet';

export function useFocusedViewFilter(
  categoryGroups: CategoryGroupEntity[],
  sheetNames: string[],
) {
  const { activeViewId, views } = useFocusedViews();
  const spreadsheet = useSpreadsheet();

  const stableSheetNamesRef = useRef(sheetNames);
  if (!areSameSheetNames(stableSheetNamesRef.current, sheetNames)) {
    stableSheetNamesRef.current = sheetNames;
  }
  const stableSheetNames = stableSheetNamesRef.current;

  const [matchingCategoryIds, setMatchingCategoryIds] = useState<Set<string>>(
    new Set(),
  );

  const [availableBuiltInViews, setAvailableBuiltInViews] = useState({
    underfunded: false,
    overfunded: false,
    overspent: false,
  });

  useEffect(() => {
    const unbinds: Array<() => void> = [];

    // Track state of each category so we only update the Set when necessary
    const categoryStates = new Map<
      string,
      {
        hasTemplate: boolean;
        months: Map<
          string,
          {
            balance: number;
            budgeted: number;
            goal: number;
            isLongGoal: boolean;
          }
        >;
      }
    >();

    const checkMatches = () => {
      let hasUnderfunded = false;
      let hasOverfunded = false;
      let hasOverspent = false;

      const activeMatch = new Set<string>();

      for (const [categoryId, state] of categoryStates.entries()) {
        let isUnderfunded = false;
        let isOverfunded = false;
        let isOverspent = false;
        let isMoneyAvailable = false;

        for (const monthState of state.months.values()) {
          const fundingValue = monthState.isLongGoal
            ? monthState.balance
            : monthState.budgeted;

          if (
            state.hasTemplate &&
            monthState.goal > 0 &&
            fundingValue < monthState.goal
          ) {
            isUnderfunded = true;
          }
          if (
            state.hasTemplate &&
            monthState.goal > 0 &&
            fundingValue > monthState.goal &&
            fundingValue > 0
          ) {
            isOverfunded = true;
          }
          if (monthState.balance < 0) {
            isOverspent = true;
          }
          if (monthState.balance > 0) {
            isMoneyAvailable = true;
          }
        }

        if (isUnderfunded) hasUnderfunded = true;
        if (isOverfunded) hasOverfunded = true;
        if (isOverspent) hasOverspent = true;

        if (activeViewId === BUILT_IN_VIEWS.UNDERFUNDED && isUnderfunded) {
          activeMatch.add(categoryId);
        } else if (activeViewId === BUILT_IN_VIEWS.OVERFUNDED && isOverfunded) {
          activeMatch.add(categoryId);
        } else if (activeViewId === BUILT_IN_VIEWS.OVERSPENT && isOverspent) {
          activeMatch.add(categoryId);
        } else if (
          activeViewId === BUILT_IN_VIEWS.MONEY_AVAILABLE &&
          isMoneyAvailable
        ) {
          activeMatch.add(categoryId);
        }
      }

      setAvailableBuiltInViews(prev => {
        if (
          prev.underfunded !== hasUnderfunded ||
          prev.overfunded !== hasOverfunded ||
          prev.overspent !== hasOverspent
        ) {
          return {
            underfunded: hasUnderfunded,
            overfunded: hasOverfunded,
            overspent: hasOverspent,
          };
        }
        return prev;
      });

      setMatchingCategoryIds(prev => {
        if (prev.size !== activeMatch.size) return activeMatch;
        for (const id of activeMatch) {
          if (!prev.has(id)) return activeMatch;
        }
        return prev;
      });
    };

    categoryGroups.forEach(group => {
      if (group.is_income) return; // Only expense categories

      group.categories?.forEach(category => {
        const categoryId = category.id;
        const state = {
          hasTemplate: !!category.goal_def?.length,
          months: new Map(),
        };

        stableSheetNames.forEach(sheetName => {
          state.months.set(sheetName, {
            balance: 0,
            budgeted: 0,
            goal: 0,
            isLongGoal: false,
          });

          const monthState = state.months.get(sheetName)!;

          const unbindBalance = spreadsheet.bind(
            sheetName,
            { name: `leftover-${categoryId}` },
            node => {
              monthState.balance =
                typeof node.value === 'number' ? node.value : 0;
              checkMatches();
            },
          );

          const unbindGoal = spreadsheet.bind(
            sheetName,
            { name: `goal-${categoryId}` },
            node => {
              monthState.goal = typeof node.value === 'number' ? node.value : 0;
              checkMatches();
            },
          );

          const unbindBudgeted = spreadsheet.bind(
            sheetName,
            { name: `budget-${categoryId}` },
            node => {
              monthState.budgeted =
                typeof node.value === 'number' ? node.value : 0;
              checkMatches();
            },
          );

          const unbindLongGoal = spreadsheet.bind(
            sheetName,
            { name: `long-goal-${categoryId}` },
            node => {
              monthState.isLongGoal = node.value === 1;
              checkMatches();
            },
          );

          unbinds.push(
            unbindBalance,
            unbindGoal,
            unbindBudgeted,
            unbindLongGoal,
          );
        });

        categoryStates.set(categoryId, state);
      });
    });

    return () => {
      unbinds.forEach(unbind => unbind());
    };
  }, [activeViewId, categoryGroups, spreadsheet, stableSheetNames]);

  const filteredCategoryGroups = useMemo(() => {
    if (!activeViewId) return categoryGroups;

    const customView = views.find(v => v.id === activeViewId);

    return categoryGroups
      .map(group => {
        // Income groups are not filtered
        if (group.is_income) return group;

        const filteredCategories = (group.categories || []).filter(cat => {
          if (customView) {
            return customView.categoryIds.includes(cat.id);
          } else {
            return matchingCategoryIds.has(cat.id);
          }
        });

        return {
          ...group,
          categories: filteredCategories,
        };
      })
      .filter(
        group =>
          group.is_income || (group.categories && group.categories.length > 0),
      );
  }, [categoryGroups, activeViewId, views, matchingCategoryIds]);

  return { filteredCategoryGroups, availableBuiltInViews };
}

function areSameSheetNames(previous: string[], next: string[]) {
  if (previous.length !== next.length) return false;

  return previous.every((sheetName, index) => sheetName === next[index]);
}
