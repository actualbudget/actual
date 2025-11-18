// @ts-strict-ignore
import React, { useMemo, useState, useEffect, type ComponentType } from 'react';

import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { AutoSizingBudgetTable } from './DynamicBudgetTable';
import * as envelopeBudget from './envelope/EnvelopeBudgetComponents';
import { EnvelopeBudgetProvider } from './envelope/EnvelopeBudgetContext';
import * as trackingBudget from './tracking/TrackingBudgetComponents';
import { TrackingBudgetProvider } from './tracking/TrackingBudgetContext';
import { prewarmAllMonths, prewarmMonth } from './util';

import {
  applyBudgetAction,
  getCategories,
} from '@desktop-client/budget/budgetSlice';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useCategoryActions } from '@desktop-client/hooks/useCategoryActions';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useDispatch } from '@desktop-client/redux';

export function Budget() {
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const dispatch = useDispatch();
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
  }, []);

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

  const onToggleCollapse = () => {
    setSummaryCollapsedPref(!summaryCollapsed);
  };

  const {
    onSaveCategory,
    onDeleteCategory,
    onSaveGroup,
    onDeleteGroup,
    onShowActivity,
    onReorderCategory,
    onReorderGroup,
  } = useCategoryActions();

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
        <AutoSizingBudgetTable
          type={budgetType}
          prewarmStartMonth={startMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
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
        <AutoSizingBudgetTable
          type={budgetType}
          prewarmStartMonth={startMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
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
