// @ts-strict-ignore
import React, { useMemo, useState, useEffect, type ComponentType } from 'react';

import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { applyPayPeriodPrefs } from 'loot-core/shared/pay-periods';
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
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
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
  const payPeriodFeatureFlagEnabled = useFeatureFlag('payPeriodsEnabled');
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');
  const [payPeriodViewEnabled] = useSyncedPref('showPayPeriods');
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

  // Wire pay period config from synced prefs into month utils
  useEffect(() => {
    if (!payPeriodFeatureFlagEnabled) {
      applyPayPeriodPrefs({
        showPayPeriods: 'false',
        payPeriodFrequency: 'monthly',
        payPeriodStartDate: monthUtils.currentMonth(),
      });
      return;
    }

    // Use the existing validation function that handles type safety
    applyPayPeriodPrefs({
      showPayPeriods: payPeriodViewEnabled,
      payPeriodFrequency,
      payPeriodStartDate,
    });
  }, [
    payPeriodFeatureFlagEnabled,
    payPeriodViewEnabled,
    payPeriodFrequency,
    payPeriodStartDate,
  ]);

  // Reset view to current month when toggling between pay periods and calendar months
  useEffect(() => {
    if (!payPeriodFeatureFlagEnabled) {
      applyPayPeriodPrefs({
        showPayPeriods: 'false',
        payPeriodFrequency: 'monthly',
        payPeriodStartDate: monthUtils.currentMonth(),
      });
      return;
    }

    // Skip initial mount
    if (!initialized) {
      return;
    }

    if (payPeriodViewEnabled === 'false') {
      // When pay periods are disabled, reset to current calendar month
      // This ensures we don't have a pay period ID in startMonthPref
      const calendarMonth = monthUtils.currentMonth();
      setStartMonthPref(calendarMonth);
    } else if (payPeriodViewEnabled === 'true') {
      // When pay periods are enabled, reset to current pay period
      // This ensures we navigate to the correct pay period, not a stale calendar month
      const currentPayPeriod = monthUtils.currentMonth();
      setStartMonthPref(currentPayPeriod);
    }
  }, [
    payPeriodFeatureFlagEnabled,
    payPeriodViewEnabled,
    setStartMonthPref,
    initialized,
  ]);

  // Refresh budget bounds when pay period config changes or when toggling pay periods on
  useEffect(() => {
    // Skip if feature flag is disabled
    if (!payPeriodFeatureFlagEnabled) {
      return;
    }

    // Skip initial mount - only trigger on actual changes
    const isInitialMount = !initialized;
    if (isInitialMount) {
      return;
    }

    // Determine if we should refresh:
    // 1. Toggling pay periods on (to ensure pay period sheets exist)
    // 2. Config changes while pay periods are enabled (frequency or start date)
    const shouldRefresh =
      payPeriodViewEnabled === 'true' &&
      (payPeriodFrequency || payPeriodStartDate);

    if (shouldRefresh) {
      send('get-budget-bounds').then(({ start, end }) => {
        setBounds({ start, end });
      });
    }
  }, [
    payPeriodFeatureFlagEnabled,
    payPeriodViewEnabled,
    payPeriodFrequency,
    payPeriodStartDate,
    initialized,
  ]);

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

  // Derive the month to render based on pay period view toggle
  const derivedStartMonth = useMemo(() => {
    const config = monthUtils.getPayPeriodConfig();
    const usePayPeriods = config?.enabled;

    if (!usePayPeriods) return startMonth;

    // If already a pay period id, keep it
    const mm = parseInt(startMonth.slice(5, 7));
    if (Number.isFinite(mm) && mm >= 13) return startMonth;

    // For calendar months, use the current year for pay periods
    const currentYear = parseInt(startMonth.slice(0, 4));
    return String(currentYear) + '-13';
  }, [startMonth, payPeriodViewEnabled]);

  // With enhanced comparison functions, we can use original bounds
  // The getValidMonthBounds function will handle mixed types safely
  const derivedBounds = bounds;

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
          prewarmStartMonth={derivedStartMonth}
          startMonth={derivedStartMonth}
          monthBounds={derivedBounds}
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
          prewarmStartMonth={derivedStartMonth}
          startMonth={derivedStartMonth}
          monthBounds={derivedBounds}
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
    <SheetNameProvider name={monthUtils.sheetForMonth(derivedStartMonth)}>
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
