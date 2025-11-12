// @ts-strict-ignore
import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { DynamicBudgetTable } from './DynamicBudgetTable';
import * as envelopeBudget from './envelope/EnvelopeBudgetComponents';
import { EnvelopeBudgetProvider } from './envelope/EnvelopeBudgetContext';
import * as trackingBudget from './tracking/TrackingBudgetComponents';
import { TrackingBudgetProvider } from './tracking/TrackingBudgetContext';
import { prewarmAllMonths, prewarmMonth } from './util';

import {
  applyBudgetAction,
  createCategory,
  createCategoryGroup,
  deleteCategory,
  deleteCategoryGroup,
  getCategories,
  moveCategory,
  moveCategoryGroup,
  updateCategory,
  updateCategoryGroup,
} from '@desktop-client/budget/budgetSlice';
import { useBudgetViews } from '@desktop-client/hooks/useBudgetViews';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

type GroupWithCats = CategoryGroupEntity & { categories: CategoryEntity[] };

type TrackingReportComponents = {
  SummaryComponent: typeof trackingBudget.BudgetSummary;
  ExpenseCategoryComponent: typeof trackingBudget.ExpenseCategoryMonth;
  ExpenseGroupComponent: typeof trackingBudget.ExpenseGroupMonth;
  IncomeCategoryComponent: typeof trackingBudget.IncomeCategoryMonth;
  IncomeGroupComponent: typeof trackingBudget.IncomeGroupMonth;
  BudgetTotalsComponent: typeof trackingBudget.BudgetTotalsMonth;
  IncomeHeaderComponent: typeof trackingBudget.IncomeHeaderMonth;
};

type EnvelopeBudgetComponents = {
  SummaryComponent: typeof envelopeBudget.BudgetSummary;
  ExpenseCategoryComponent: typeof envelopeBudget.ExpenseCategoryMonth;
  ExpenseGroupComponent: typeof envelopeBudget.ExpenseGroupMonth;
  IncomeCategoryComponent: typeof envelopeBudget.IncomeCategoryMonth;
  IncomeGroupComponent: typeof envelopeBudget.IncomeGroupMonth;
  BudgetTotalsComponent: typeof envelopeBudget.BudgetTotalsMonth;
  IncomeHeaderComponent: typeof envelopeBudget.IncomeHeaderMonth;
};

type BudgetInnerProps = {
  accountId?: string;
  trackingComponents: TrackingReportComponents;
  envelopeComponents: EnvelopeBudgetComponents;
};

function BudgetInner(props: BudgetInnerProps) {
  const { t } = useTranslation();
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [summaryCollapsed, setSummaryCollapsedPref] = useLocalPref(
    'budget.summaryCollapsed',
  );
  const [startMonthPref, setStartMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const [bounds, setBounds] = useState({
    start: startMonth,
    end: startMonth,
  });
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [maxMonthsPref] = useGlobalPref('maxMonths');
  const maxMonths = maxMonthsPref || 1;
  const [initialized, setInitialized] = useState(false);
  const { grouped: categoryGroups } = useCategories();
  const [activeSelectedViews, setActiveSelectedViews] = useState<
    string[] | null
  >(null);
  const {
    views = [],
    viewCategoryOrder = {},
    viewGroupOrder = {},
    setViewCategoryOrder,
    setViewGroupOrder,
    viewMap = {},
  } = useBudgetViews();

  useEffect(() => {
    async function run() {
      await dispatch(getCategories());

      const { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });

      await prewarmAllMonths(
        budgetType,
        spreadsheet,
        { start, end },
        startMonth,
      );

      setInitialized(true);
    }

    run();
  }, []);

  useEffect(() => {
    send('get-budget-bounds').then(({ start, end }) => {
      if (bounds.start !== start || bounds.end !== end) {
        setBounds({ start, end });
      }
    });
  }, [props.accountId]);

  useEffect(() => {
    if (!categoryGroups || categoryGroups.length === 0) {
      return;
    }

    const validGroupIds = new Set(categoryGroups.map(group => group.id));

    Object.entries(viewGroupOrder).forEach(([viewId, order]) => {
      if (!Array.isArray(order) || order.length === 0) {
        return;
      }

      const filtered = order.filter(groupId => validGroupIds.has(groupId));

      if (filtered.length !== order.length) {
        setViewGroupOrder(viewId, filtered);
      }
    });
  }, [categoryGroups, viewGroupOrder, setViewGroupOrder]);

  useEffect(() => {
    if (!categoryGroups || categoryGroups.length === 0) {
      return;
    }

    const globalCategoryOrder = categoryGroups.flatMap(group =>
      (group.categories || []).map(category => category.id),
    );

    const getCategoriesForView = (viewId: string) =>
      globalCategoryOrder.filter(catId =>
        Array.isArray(viewMap[catId]) ? viewMap[catId].includes(viewId) : false,
      );

    const getGroupsForView = (viewId: string) =>
      categoryGroups
        .filter(group =>
          (group.categories || []).some(category =>
            Array.isArray(viewMap[category.id])
              ? viewMap[category.id].includes(viewId)
              : false,
          ),
        )
        .map(group => group.id);

    views.forEach(view => {
      if (!viewCategoryOrder[view.id]) {
        const categoryIds = getCategoriesForView(view.id);
        if (categoryIds.length > 0) {
          setViewCategoryOrder(view.id, categoryIds);
        }
      }

      if (!viewGroupOrder[view.id]) {
        const groupIds = getGroupsForView(view.id);
        if (groupIds.length > 0) {
          setViewGroupOrder(view.id, groupIds);
        }
      }
    });
  }, [
    categoryGroups,
    views,
    viewMap,
    viewCategoryOrder,
    viewGroupOrder,
    setViewCategoryOrder,
    setViewGroupOrder,
  ]);

  const onMonthSelect = async (month, numDisplayed) => {
    setStartMonthPref(month);

    const warmingMonth = month;

    // We could be smarter about this, but this is a good start. We
    // optimize for the case where users press the left/right button
    // to move between months. This loads the month data all at once
    // and "prewarms" the spreadsheet cache. This uses a simple
    // heuristic that will fail if the user clicks an arbitrary month,
    // but it will just load in some unnecessary data.
    if (month < startMonth) {
      // pre-warm prev month
      await prewarmMonth(
        budgetType,
        spreadsheet,
        monthUtils.subMonths(month, 1),
      );
    } else if (month > startMonth) {
      // pre-warm next month
      await prewarmMonth(
        budgetType,
        spreadsheet,
        monthUtils.addMonths(month, numDisplayed),
      );
    }

    if (warmingMonth === month) {
      setStartMonthPref(month);
    }
  };

  const categoryNameAlreadyExistsNotification = (name: string) => {
    dispatch(
      addNotification({
        notification: {
          type: 'error',
          message: t(
            'Category “{{name}}” already exists in group (it may be hidden)',
            { name },
          ),
        },
      }),
    );
  };

  const onSaveCategory = async category => {
    const cats = await send('get-categories');
    const exists =
      cats.grouped
        .filter(g => g.id === category.group)[0]
        .categories.filter(
          c => c.name.toUpperCase() === category.name.toUpperCase(),
        )
        .filter(c => (category.id === 'new' ? true : c.id !== category.id))
        .length > 0;

    if (exists) {
      categoryNameAlreadyExistsNotification(category.name);
      return;
    }

    if (category.id === 'new') {
      dispatch(
        createCategory({
          name: category.name,
          groupId: category.group,
          isIncome: category.is_income,
          isHidden: category.hidden,
        }),
      );
    } else {
      dispatch(updateCategory({ category }));
    }
  };

  const onDeleteCategory = async id => {
    const mustTransfer = await send('must-category-transfer', { id });

    if (mustTransfer) {
      dispatch(
        pushModal({
          modal: {
            name: 'confirm-category-delete',
            options: {
              category: id,
              onDelete: transferCategory => {
                if (id !== transferCategory) {
                  dispatch(
                    deleteCategory({ id, transferId: transferCategory }),
                  );
                }
              },
            },
          },
        }),
      );
    } else {
      dispatch(deleteCategory({ id }));
    }
  };

  const onSaveGroup = group => {
    if (group.id === 'new') {
      dispatch(createCategoryGroup({ name: group.name }));
    } else {
      dispatch(updateCategoryGroup({ group }));
    }
  };

  const onDeleteGroup = async id => {
    const group = categoryGroups.find(g => g.id === id);

    let mustTransfer = false;
    for (const category of group.categories) {
      if (await send('must-category-transfer', { id: category.id })) {
        mustTransfer = true;
        break;
      }
    }

    if (mustTransfer) {
      dispatch(
        pushModal({
          modal: {
            name: 'confirm-category-delete',
            options: {
              group: id,
              onDelete: transferCategory => {
                dispatch(
                  deleteCategoryGroup({ id, transferId: transferCategory }),
                );
              },
            },
          },
        }),
      );
    } else {
      dispatch(deleteCategoryGroup({ id }));
    }
  };

  const onApplyBudgetTemplatesInGroup = async categories => {
    dispatch(
      applyBudgetAction({
        month: startMonth,
        type: 'apply-multiple-templates',
        args: {
          categories,
        },
      }),
    );
  };

  const onBudgetAction = (month, type, args) => {
    dispatch(applyBudgetAction({ month, type, args }));
  };

  const onShowActivity = (categoryId, month) => {
    const filterConditions = [
      { field: 'category', op: 'is', value: categoryId, type: 'id' },
      {
        field: 'date',
        op: 'is',
        value: month,
        options: { month: true },
        type: 'date',
      },
    ];
    navigate('/accounts', {
      state: {
        goBack: true,
        filterConditions,
        categoryId,
      },
    });
  };

  const onReorderCategory = async sortInfo => {
    const cats = await send('get-categories');
    // If exactly one budget view is selected, persist the reorder as a
    // view-scoped ordering preference instead of changing the global DB order.
    if (activeSelectedViews && activeSelectedViews.length === 1) {
      const viewId = activeSelectedViews[0];

      // Make a shallow copy of grouped categories so we can mutate locally
      const groups = (cats.grouped || []).map(g => ({
        ...g,
        categories: Array.isArray(g.categories) ? [...g.categories] : [],
      }));

      // Remove the moved category from its original group
      for (const g of groups) {
        const idx = g.categories.findIndex(c => c.id === sortInfo.id);
        if (idx !== -1) {
          g.categories.splice(idx, 1);
          break;
        }
      }

      // Insert into the target group at position before targetId, or at start
      const targetGroup = groups.find(g => g.id === sortInfo.groupId);
      if (targetGroup) {
        if (sortInfo.targetId) {
          const tIdx = targetGroup.categories.findIndex(
            c => c.id === sortInfo.targetId,
          );
          const insertIdx = tIdx === -1 ? 0 : tIdx;
          // Find the moved candidate from the full list to preserve object shape
          const moved = cats.list.find(c => c.id === sortInfo.id);
          if (moved) {
            targetGroup.categories.splice(insertIdx, 0, moved);
          }
        } else {
          const moved = cats.list.find(c => c.id === sortInfo.id);
          if (moved) {
            targetGroup.categories.splice(0, 0, moved);
          }
        }
      }

      // Build flattened order and filter to only categories that belong to this view
      const flattened = groups.flatMap(g =>
        (g.categories || []).map(c => c.id),
      );
      const newOrder = flattened.filter(id =>
        Array.isArray(viewMap[id]) ? viewMap[id].includes(viewId) : false,
      );

      setViewCategoryOrder(viewId, newOrder);
      return;
    }
    const moveCandidate = cats.list.filter(c => c.id === sortInfo.id)[0];
    const exists =
      cats.grouped
        .filter(g => g.id === sortInfo.groupId)[0]
        .categories.filter(
          c => c.name.toUpperCase() === moveCandidate.name.toUpperCase(),
        )
        .filter(c => c.id !== moveCandidate.id).length > 0;

    if (exists) {
      categoryNameAlreadyExistsNotification(moveCandidate.name);
      return;
    }

    dispatch(
      moveCategory({
        id: sortInfo.id,
        groupId: sortInfo.groupId,
        targetId: sortInfo.targetId,
      }),
    );
  };

  const onReorderGroup = async sortInfo => {
    // If exactly one budget view is selected, persist group ordering to the
    // view-scoped preference instead of changing the global DB order.
    if (activeSelectedViews && activeSelectedViews.length === 1) {
      const viewId = activeSelectedViews[0];

      const cats = await send('get-categories');

      // Make a shallow copy of grouped categories so we can mutate locally
      const groups: GroupWithCats[] = (cats.grouped || []).map(g => ({
        ...(g as CategoryGroupEntity),
        categories: Array.isArray(g.categories) ? [...g.categories] : [],
      }));

      // Remove the moved group from its original position
      const removeIdx = groups.findIndex(g => g.id === sortInfo.id);
      let moved: GroupWithCats | null = null;
      if (removeIdx !== -1) {
        moved = groups.splice(removeIdx, 1)[0];
      }

      // Insert into the target position: before targetId when provided, else at start
      if (moved) {
        if (sortInfo.targetId) {
          const tIdx = groups.findIndex(g => g.id === sortInfo.targetId);
          const insertIdx = tIdx === -1 ? 0 : tIdx;
          groups.splice(insertIdx, 0, moved);
        } else {
          groups.splice(0, 0, moved);
        }
      }

      // Build flattened group order and filter to groups that contain categories
      // belonging to this view
      const flattened = groups.map(g => g.id);
      const newOrder = flattened.filter(gid => {
        const g = groups.find(x => x.id === gid);
        return (
          g!.categories.filter(c =>
            Array.isArray(viewMap[c.id])
              ? viewMap[c.id].includes(viewId)
              : false,
          ).length > 0
        );
      });

      setViewGroupOrder(viewId, newOrder);
      return;
    }

    dispatch(
      moveCategoryGroup({ id: sortInfo.id, targetId: sortInfo.targetId }),
    );
  };

  const onToggleCollapse = () => {
    setSummaryCollapsedPref(!summaryCollapsed);
  };

  const { trackingComponents, envelopeComponents } = props;

  if (!initialized || !categoryGroups) {
    return null;
  }

  let table;
  if (budgetType === 'tracking') {
    table = (
      <TrackingBudgetProvider
        summaryCollapsed={summaryCollapsed}
        onBudgetAction={onBudgetAction}
        onToggleSummaryCollapse={onToggleCollapse}
      >
        <DynamicBudgetTable
          type={budgetType}
          prewarmStartMonth={startMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          dataComponents={trackingComponents}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
          onViewSelectionChange={setActiveSelectedViews}
          activeSelectedViews={activeSelectedViews}
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
        />
      </TrackingBudgetProvider>
    );
  } else {
    table = (
      <EnvelopeBudgetProvider
        summaryCollapsed={summaryCollapsed}
        onBudgetAction={onBudgetAction}
        onToggleSummaryCollapse={onToggleCollapse}
      >
        <DynamicBudgetTable
          type={budgetType}
          prewarmStartMonth={startMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          dataComponents={envelopeComponents}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
          onViewSelectionChange={setActiveSelectedViews}
          activeSelectedViews={activeSelectedViews}
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
        />
      </EnvelopeBudgetProvider>
    );
  }

  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
      <View style={{ flex: 1 }}>{table}</View>
    </SheetNameProvider>
  );
}

export function Budget() {
  const trackingComponents = useMemo<TrackingReportComponents>(
    () => ({
      SummaryComponent: trackingBudget.BudgetSummary,
      ExpenseCategoryComponent: trackingBudget.ExpenseCategoryMonth,
      ExpenseGroupComponent: trackingBudget.ExpenseGroupMonth,
      IncomeCategoryComponent: trackingBudget.IncomeCategoryMonth,
      IncomeGroupComponent: trackingBudget.IncomeGroupMonth,
      BudgetTotalsComponent: trackingBudget.BudgetTotalsMonth,
      IncomeHeaderComponent: trackingBudget.IncomeHeaderMonth,
    }),
    [trackingBudget],
  );

  const envelopeComponents = useMemo<EnvelopeBudgetComponents>(
    () => ({
      SummaryComponent: envelopeBudget.BudgetSummary,
      ExpenseCategoryComponent: envelopeBudget.ExpenseCategoryMonth,
      ExpenseGroupComponent: envelopeBudget.ExpenseGroupMonth,
      IncomeCategoryComponent: envelopeBudget.IncomeCategoryMonth,
      IncomeGroupComponent: envelopeBudget.IncomeGroupMonth,
      BudgetTotalsComponent: envelopeBudget.BudgetTotalsMonth,
      IncomeHeaderComponent: envelopeBudget.IncomeHeaderMonth,
    }),
    [envelopeBudget],
  );

  // In a previous iteration, the wrapper needs `overflow: hidden` for
  // some reason. Without it at certain dimensions the width/height
  // that autosizer gives us is slightly wrong, causing scrollbars to
  // appear. We might not need it anymore?
  return (
    <View
      style={{
        ...styles.page,
        paddingLeft: 8,
        paddingRight: 8,
        overflow: 'hidden',
      }}
    >
      <BudgetInner
        trackingComponents={trackingComponents}
        envelopeComponents={envelopeComponents}
      />
    </View>
  );
}
