// @ts-strict-ignore
import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { loadPayPeriodConfigFromPrefs } from 'loot-core/shared/pay-periods';

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
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { createTransactionFilterConditions } from '@desktop-client/hooks/usePayPeriodTranslation';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

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
      return;
    }

    // Use the existing validation function that handles type safety
    loadPayPeriodConfigFromPrefs({
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
  }, [props.accountId]);

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

  const categoryNameAlreadyExistsNotification = name => {
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
    const filterConditions = createTransactionFilterConditions(
      month,
      categoryId,
    );
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
    dispatch(
      moveCategoryGroup({ id: sortInfo.id, targetId: sortInfo.targetId }),
    );
  };

  const onToggleCollapse = () => {
    setSummaryCollapsedPref(!summaryCollapsed);
  };

  const { trackingComponents, envelopeComponents } = props;

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
        <DynamicBudgetTable
          type={budgetType}
          prewarmStartMonth={derivedStartMonth}
          startMonth={derivedStartMonth}
          monthBounds={derivedBounds}
          maxMonths={maxMonths}
          // @ts-expect-error fix me
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
          prewarmStartMonth={derivedStartMonth}
          startMonth={derivedStartMonth}
          monthBounds={derivedBounds}
          maxMonths={maxMonths}
          // @ts-expect-error fix me
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
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
        />
      </EnvelopeBudgetProvider>
    );
  }

  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(derivedStartMonth)}>
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
