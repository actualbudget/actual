import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  FocusedViewDefinition,
  SyncedPrefs,
} from '@actual-app/core/types/prefs';
import { v4 as uuidv4 } from 'uuid';

import { useSyncedPref } from './useSyncedPref';

function useSyncedPrefJson<T>(
  prefName: keyof SyncedPrefs,
  defaultValue: T,
): [T, (val: T) => void] {
  const [pref, setPref] = useSyncedPref(prefName);

  // Use optimistic local state for instant UI updates
  const [localValue, setLocalValue] = useState<T>(() => {
    try {
      return pref !== undefined ? JSON.parse(pref) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const lastPrefRef = useRef(pref);

  // Sync local state if Redux state changes externally
  useEffect(() => {
    if (pref !== lastPrefRef.current) {
      lastPrefRef.current = pref;
      try {
        setLocalValue(pref !== undefined ? JSON.parse(pref) : defaultValue);
      } catch {
        setLocalValue(defaultValue);
      }
    }
  }, [pref, defaultValue]);

  const setValue = useCallback(
    (val: T) => {
      setLocalValue(val);
      setPref(JSON.stringify(val));
    },
    [setPref],
  );

  return [localValue, setValue];
}

export const BUILT_IN_VIEWS = {
  UNDERFUNDED: '__underfunded',
  OVERFUNDED: '__overfunded',
  OVERSPENT: '__overspent',
  MONEY_AVAILABLE: '__money-available',
} as const;

export function useFocusedViews() {
  const [storedViews, setViews] = useSyncedPrefJson<FocusedViewDefinition[]>(
    'budget.focusedViews',
    [],
  );
  const [activeViewId, setActiveViewId] = useSyncedPrefJson<string | null>(
    'budget.activeFocusedView',
    null,
  );
  const [isCollapsed, setIsCollapsed] = useSyncedPrefJson<boolean>(
    'budget.focusedViewsCollapsed',
    false,
  );

  const views = useMemo(
    () =>
      [...storedViews].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [storedViews],
  );

  const normalizeSortOrder = useCallback(
    (views: FocusedViewDefinition[]) =>
      views.map((view, index) => ({ ...view, sortOrder: index })),
    [],
  );

  const setActiveView = useCallback(
    (id: string | null) => {
      setActiveViewId(id);
    },
    [setActiveViewId],
  );

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      setIsCollapsed(collapsed);
    },
    [setIsCollapsed],
  );

  const createView = useCallback(
    (name: string, categoryIds: string[]) => {
      const newView: FocusedViewDefinition = {
        id: uuidv4(),
        name,
        categoryIds,
        sortOrder: views.length,
      };
      setViews(normalizeSortOrder([...views, newView]));
      setActiveViewId(newView.id);
    },
    [views, normalizeSortOrder, setViews, setActiveViewId],
  );

  const updateView = useCallback(
    (id: string, updates: Partial<FocusedViewDefinition>) => {
      setViews(
        normalizeSortOrder(
          views.map(view => (view.id === id ? { ...view, ...updates } : view)),
        ),
      );
    },
    [views, normalizeSortOrder, setViews],
  );

  const deleteView = useCallback(
    (id: string) => {
      setViews(normalizeSortOrder(views.filter(view => view.id !== id)));
      if (activeViewId === id) {
        setActiveViewId(null);
      }
    },
    [views, activeViewId, normalizeSortOrder, setViews, setActiveViewId],
  );

  const isBuiltInView = useCallback((id: string) => {
    return Object.values(BUILT_IN_VIEWS).some(viewId => viewId === id);
  }, []);

  const [builtInViewsOrder] = useSyncedPrefJson<string[]>(
    'budget.builtInViewsOrder',
    [
      BUILT_IN_VIEWS.OVERSPENT,
      BUILT_IN_VIEWS.UNDERFUNDED,
      BUILT_IN_VIEWS.OVERFUNDED,
      BUILT_IN_VIEWS.MONEY_AVAILABLE,
    ],
  );

  const [storedViewOrder, setViewOrder] = useSyncedPrefJson<string[]>(
    'budget.viewOrder',
    [],
  );

  const [hiddenViews, setHiddenViews] = useSyncedPrefJson<string[]>(
    'budget.hiddenViews',
    [],
  );
  const [showHiddenViews, setShowHiddenViews] = useSyncedPrefJson<boolean>(
    'budget.showHiddenViews',
    false,
  );

  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const viewOrder = useMemo(() => {
    // Merge builtInViewsOrder and views.map(v => v.id) into storedViewOrder if missing
    let nextOrder = [...storedViewOrder];
    const expectedBuiltIns =
      budgetType === 'tracking'
        ? builtInViewsOrder.filter(id => id !== BUILT_IN_VIEWS.MONEY_AVAILABLE)
        : builtInViewsOrder;
    const allExpectedIds = [...expectedBuiltIns, ...views.map(v => v.id)];

    for (const id of allExpectedIds) {
      if (!nextOrder.includes(id)) {
        nextOrder.push(id);
      }
    }

    // Clean up deleted views
    nextOrder = nextOrder.filter(id => allExpectedIds.includes(id));

    return nextOrder;
  }, [storedViewOrder, builtInViewsOrder, views, budgetType]);

  const saveViewOrder = useCallback(
    (nextOrder: string[]) => {
      setViewOrder(nextOrder);
    },
    [setViewOrder],
  );

  const reorderViewToTarget = useCallback(
    (id: string, dropPos: 'top' | 'bottom' | null, targetId: string) => {
      const nextOrder = [...viewOrder];
      const currentIndex = nextOrder.indexOf(id);
      if (currentIndex === -1) return;

      nextOrder.splice(currentIndex, 1);

      let targetIndex = nextOrder.indexOf(targetId);
      if (targetIndex === -1) return;

      if (dropPos === 'bottom') {
        targetIndex += 1;
      }

      nextOrder.splice(targetIndex, 0, id);
      saveViewOrder(nextOrder);
    },
    [viewOrder, saveViewOrder],
  );

  const toggleViewVisibility = useCallback(
    (id: string) => {
      if (hiddenViews.includes(id)) {
        setHiddenViews(hiddenViews.filter(v => v !== id));
      } else {
        setHiddenViews([...hiddenViews, id]);
        if (activeViewId === id) {
          setActiveView(null);
        }
      }
    },
    [hiddenViews, setHiddenViews, activeViewId, setActiveView],
  );

  const toggleShowHiddenViews = useCallback(() => {
    setShowHiddenViews(!showHiddenViews);
  }, [showHiddenViews, setShowHiddenViews]);

  return {
    views,
    activeViewId,
    isCollapsed,
    builtInViewsOrder,
    viewOrder,
    hiddenViews,
    showHiddenViews,
    setActiveView,
    setCollapsed,
    createView,
    updateView,
    deleteView,
    reorderViewToTarget,
    toggleViewVisibility,
    toggleShowHiddenViews,
    isBuiltInView,
  };
}
