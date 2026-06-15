import { useCallback, useMemo } from 'react';

import type { FocusedViewDefinition } from '@actual-app/core/types/prefs';
import { v4 as uuidv4 } from 'uuid';

import { useLocalPref } from './useLocalPref';

export const BUILT_IN_VIEWS = {
  UNDERFUNDED: '__underfunded',
  OVERFUNDED: '__overfunded',
  OVERSPENT: '__overspent',
  MONEY_AVAILABLE: '__money-available',
} as const;

export function useFocusedViews() {
  const [storedViews = [], setViews] = useLocalPref('budget.focusedViews');
  const [activeViewId = null, setActiveViewId] = useLocalPref(
    'budget.activeFocusedView',
  );
  const [isCollapsed = false, setIsCollapsed] = useLocalPref(
    'budget.focusedViewsCollapsed',
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

  const reorderView = useCallback(
    (id: string, direction: -1 | 1) => {
      const currentIndex = views.findIndex(view => view.id === id);
      const nextIndex = currentIndex + direction;

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= views.length) {
        return;
      }

      const nextViews = [...views];
      const [view] = nextViews.splice(currentIndex, 1);
      nextViews.splice(nextIndex, 0, view);
      setViews(normalizeSortOrder(nextViews));
    },
    [views, normalizeSortOrder, setViews],
  );

  const isBuiltInView = useCallback((id: string) => {
    return Object.values(BUILT_IN_VIEWS).some(viewId => viewId === id);
  }, []);

  const [builtInViewsOrder = [
    BUILT_IN_VIEWS.OVERSPENT,
    BUILT_IN_VIEWS.UNDERFUNDED,
    BUILT_IN_VIEWS.OVERFUNDED,
    BUILT_IN_VIEWS.MONEY_AVAILABLE
  ], setBuiltInViewsOrder] = useLocalPref('budget.builtInViewsOrder');

  const [storedViewOrder = [], setViewOrder] = useLocalPref('budget.viewOrder');

  const [hiddenViews = [], setHiddenViews] = useLocalPref('budget.hiddenViews');
  const [showHiddenViews = false, setShowHiddenViews] = useLocalPref('budget.showHiddenViews');

  const viewOrder = useMemo(() => {
    // Merge builtInViewsOrder and views.map(v => v.id) into storedViewOrder if missing
    let nextOrder = [...storedViewOrder];
    const allExpectedIds = [
      ...builtInViewsOrder,
      ...views.map(v => v.id)
    ];

    for (const id of allExpectedIds) {
      if (!nextOrder.includes(id)) {
        nextOrder.push(id);
      }
    }
    
    // Clean up deleted views
    nextOrder = nextOrder.filter(id => allExpectedIds.includes(id));
    
    return nextOrder;
  }, [storedViewOrder, builtInViewsOrder, views]);

  const saveViewOrder = useCallback((nextOrder: string[]) => {
    setViewOrder(nextOrder);
  }, [setViewOrder]);

  const reorderViewToTarget = useCallback((id: string, dropPos: 'top' | 'bottom' | null, targetId: string) => {
    let nextOrder = [...viewOrder];
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
  }, [viewOrder, saveViewOrder]);

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
