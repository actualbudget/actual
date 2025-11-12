import { useMemo } from 'react';

import { useSyncedPrefJson } from './useSyncedPrefJson';

export type BudgetView = {
  id: string;
  name: string;
};

export type BudgetViewMap = Record<string, string[]>;

export function useBudgetViews(): {
  views: BudgetView[];
  viewMap: BudgetViewMap;
  updateView: (viewId: string, updates: Partial<BudgetView>) => void;
  removeView: (viewId: string) => void;
} {
  // Get all custom budget views
  const [customViews = [], setCustomViews] = useSyncedPrefJson<
    'budget.customBudgetViews',
    BudgetView[]
  >('budget.customBudgetViews', []);

  // Get the mapping of categories to views
  const [budgetViewMap = {}, setBudgetViewMapPref] = useSyncedPrefJson<
    'budget.budgetViewMap',
    BudgetViewMap
  >('budget.budgetViewMap', {});

  // Get deduplicated list of views
  const views = useMemo(() => {
    const allCustomViews = Array.isArray(customViews) ? customViews : [];
    const seen = new Set<string>();
    return allCustomViews.filter(view => {
      if (seen.has(view.id)) {
        return false;
      }
      seen.add(view.id);
      return true;
    });
  }, [customViews]);

  // Update a view's properties
  const updateView = (viewId: string, updates: Partial<BudgetView>) => {
    const oldView = customViews.find(v => v.id === viewId);
    if (!oldView) {
      return;
    }

    const newView = { ...oldView, ...updates };

    // Update the view in customViews
    const updatedViews = customViews.map(view =>
      view.id === viewId ? newView : view,
    );
    setCustomViews(updatedViews);

    // If name changed, update associated categories as needed
    if (oldView.name && updates.name && oldView.name !== updates.name) {
      // Copy the old view's categories to avoid conflicts
      const viewCategories = Object.keys(budgetViewMap).reduce(
        (acc, catId) => {
          if (budgetViewMap[catId].includes(oldView.name)) {
            acc[catId] = true;
          }
          return acc;
        },
        {} as Record<string, boolean>,
      );

      // Update the view map references with new name
      const newMap = Object.keys(budgetViewMap).reduce(
        (acc, catId) => {
          const views =
            budgetViewMap[catId]?.filter(name => name !== oldView.name) || [];
          if (viewCategories[catId] && updates.name) {
            views.push(updates.name);
          }
          if (views.length > 0) {
            acc[catId] = views;
          }
          return acc;
        },
        {} as Record<string, string[]>,
      );

      setBudgetViewMapPref(newMap);
    }
  };

  // Remove a view entirely
  const removeView = (viewId: string) => {
    // Remove from custom views
    setCustomViews(customViews.filter(v => v.id !== viewId));

    // Remove from category mappings
    const newMap = { ...budgetViewMap };
    Object.keys(newMap).forEach(categoryId => {
      const viewIds = newMap[categoryId];
      if (Array.isArray(viewIds)) {
        newMap[categoryId] = viewIds.filter(id => id !== viewId);
        if (newMap[categoryId].length === 0) {
          delete newMap[categoryId];
        }
      }
    });
    setBudgetViewMapPref(newMap);
  };

  return {
    views,
    viewMap: budgetViewMap,
    updateView,
    removeView,
  };
}
