// @ts-strict-ignore
import type { ComponentType } from 'react';
import React, { useEffect, useEffectEvent, useMemo, useState } from 'react';

import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import {
  budgetQueries,
  useBudgetActions,
  useDeleteCategoryGroupMutation,
  useDeleteCategoryMutation,
  useReorderCategoryGroupMutation,
  useReorderCategoryMutation,
  useSaveCategoryGroupMutation,
  useSaveCategoryMutation,
  useSortCategoriesMutation,
} from '#budget';
import { useCategories } from '#hooks/useCategories';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { AutoSizingBudgetTable } from './DynamicBudgetTable';
import * as envelopeBudget from './envelope/EnvelopeBudgetComponents';
import { EnvelopeBudgetProvider } from './envelope/EnvelopeBudgetContext';
import type { MonthBounds } from './MonthsContext';
import * as trackingBudget from './tracking/TrackingBudgetComponents';
import { TrackingBudgetProvider } from './tracking/TrackingBudgetContext';
import { prewarmAllMonths, prewarmMonth } from './util';

export function Budget() {
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const navigate = useNavigate();
  const [summaryCollapsed, setSummaryCollapsedPref] = useLocalPref(
    'budget.summaryCollapsed',
  );
  const [startMonthPref, setStartMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const { data: bounds } = useQuery(budgetQueries.bounds());
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [maxMonthsPref] = useGlobalPref('maxMonths');
  const maxMonths = maxMonthsPref || 1;
  // Only wait for prewarming on the first visit; after that the cache is warm
  const [initialized, setInitialized] = useState(bounds != null);
  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();

  const prewarm = useEffectEvent(async (monthBounds: MonthBounds) => {
    try {
      await prewarmAllMonths(budgetType, spreadsheet, monthBounds, startMonth);
    } finally {
      setInitialized(true);
    }
  });
  useEffect(() => {
    if (bounds) {
      void prewarm(bounds);
    }
  }, [bounds]);

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

  const onToggleCollapse = () => {
    setSummaryCollapsedPref(!summaryCollapsed);
  };

  const onApplyBudgetTemplatesInGroup = async categories => {
    applyBudgetAction.mutate({
      month: startMonth,
      type: 'apply-multiple-templates',
      args: {
        categories,
      },
    });
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
    void navigate('/accounts', {
      state: {
        goBack: true,
        filterConditions,
        categoryId,
      },
    });
  };

  const saveCategory = useSaveCategoryMutation();
  const onSaveCategory = category => {
    saveCategory.mutate({ category });
  };
  const deleteCategory = useDeleteCategoryMutation();
  const onDeleteCategory = id => {
    deleteCategory.mutate({ id });
  };
  const reorderCategory = useReorderCategoryMutation();
  const saveCategoryGroup = useSaveCategoryGroupMutation();
  const onSaveCategoryGroup = group => {
    saveCategoryGroup.mutate({ group });
  };
  const deleteCategoryGroup = useDeleteCategoryGroupMutation();
  const onDeleteCategoryGroup = id => {
    deleteCategoryGroup.mutate({ id });
  };
  const reorderCategoryGroup = useReorderCategoryGroupMutation();
  const sortCategories = useSortCategoriesMutation();
  const applyBudgetAction = useBudgetActions();

  const onBudgetAction = (month, type, args) => {
    applyBudgetAction.mutate({ month, type, args });
  };

  if (!initialized || !bounds || !categoryGroups) {
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
        <AutoSizingBudgetTable
          type={budgetType}
          prewarmStartMonth={startMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteCategoryGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveCategoryGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={reorderCategory.mutate}
          onReorderGroup={reorderCategoryGroup.mutate}
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
          onSortCategories={(groupId, direction) =>
            sortCategories.mutate({ groupId, direction })
          }
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
        <AutoSizingBudgetTable
          type={budgetType}
          prewarmStartMonth={startMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteCategoryGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveCategoryGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={reorderCategory.mutate}
          onReorderGroup={reorderCategoryGroup.mutate}
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
          onSortCategories={(groupId, direction) =>
            sortCategories.mutate({ groupId, direction })
          }
        />
      </EnvelopeBudgetProvider>
    );
  }

  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
      {/*
        In a previous iteration, the wrapper needs `overflow: hidden` for
        some reason. Without it at certain dimensions the width/height
        that autosizer gives us is slightly wrong, causing scrollbars to
        appear. We might not need it anymore?
      */}
      <View
        style={{
          ...styles.page,
          paddingLeft: 8,
          paddingRight: 8,
          overflow: 'hidden',
        }}
      >
        <View style={{ flex: 1 }}>{table}</View>
      </View>
    </SheetNameProvider>
  );
}

export type BudgetSummaryProps = {
  month: string;
};

export type CategoryMonthProps = {
  month: string;
  category: CategoryEntity;
  editing: boolean;
  isLast?: boolean;
  onEdit: (id: CategoryEntity['id'] | null, month?: string) => void;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
};

export type CategoryGroupMonthProps = {
  month: string;
  group: CategoryGroupEntity;
};

export type BudgetComponents = {
  SummaryComponent: ComponentType<BudgetSummaryProps>;
  ExpenseCategoryComponent: ComponentType<CategoryMonthProps>;
  ExpenseGroupComponent: ComponentType<CategoryGroupMonthProps>;
  IncomeCategoryComponent: ComponentType<CategoryMonthProps>;
  IncomeGroupComponent: ComponentType<CategoryGroupMonthProps>;
  BudgetTotalsComponent: ComponentType;
  IncomeHeaderComponent: ComponentType;
};

export function useBudgetComponents(): BudgetComponents {
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const envelopeComponents = useEnvelopeBudgetComponents();
  const trackingComponents = useTrackingBudgetComponents();

  return budgetType === 'envelope' ? envelopeComponents : trackingComponents;
}

function useTrackingBudgetComponents(): BudgetComponents {
  return useMemo(
    () => ({
      SummaryComponent: trackingBudget.BudgetSummary,
      ExpenseCategoryComponent: trackingBudget.ExpenseCategoryMonth,
      ExpenseGroupComponent: trackingBudget.ExpenseGroupMonth,
      IncomeCategoryComponent: trackingBudget.IncomeCategoryMonth,
      IncomeGroupComponent: trackingBudget.IncomeGroupMonth,
      BudgetTotalsComponent: trackingBudget.BudgetTotalsMonth,
      IncomeHeaderComponent: trackingBudget.IncomeHeaderMonth,
    }),
    [],
  );
}

function useEnvelopeBudgetComponents(): BudgetComponents {
  return useMemo(
    () => ({
      SummaryComponent: envelopeBudget.BudgetSummary,
      ExpenseCategoryComponent: envelopeBudget.ExpenseCategoryMonth,
      ExpenseGroupComponent: envelopeBudget.ExpenseGroupMonth,
      IncomeCategoryComponent: envelopeBudget.IncomeCategoryMonth,
      IncomeGroupComponent: envelopeBudget.IncomeGroupMonth,
      BudgetTotalsComponent: envelopeBudget.BudgetTotalsMonth,
      IncomeHeaderComponent: envelopeBudget.IncomeHeaderMonth,
    }),
    [],
  );
}
