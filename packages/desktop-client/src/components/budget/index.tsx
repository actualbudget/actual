// @ts-strict-ignore
import React, { memo, useContext, useMemo, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import {
  addNotification,
  applyBudgetAction,
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  getCategories,
  loadPrefs,
  moveCategory,
  moveCategoryGroup,
  pushModal,
  updateCategory,
  updateGroup,
} from 'loot-core/src/client/actions';
import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../hooks/useCategories';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useNavigate } from '../../hooks/useNavigate';
import { styles } from '../../style';
import { View } from '../common/View';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';
import {
  SWITCH_BUDGET_MESSAGE_TYPE,
  TitlebarContext,
  type TitlebarContextValue,
  type TitlebarMessage,
} from '../Titlebar';

import { DynamicBudgetTable } from './DynamicBudgetTable';
import * as report from './report/ReportComponents';
import { ReportProvider } from './report/ReportContext';
import * as rollover from './rollover/RolloverComponents';
import { RolloverProvider } from './rollover/RolloverContext';
import { prewarmAllMonths, prewarmMonth, switchBudgetType } from './util';

type ReportComponents = {
  SummaryComponent: typeof report.BudgetSummary;
  ExpenseCategoryComponent: typeof report.ExpenseCategoryMonth;
  ExpenseGroupComponent: typeof report.ExpenseGroupMonth;
  IncomeCategoryComponent: typeof report.IncomeCategoryMonth;
  IncomeGroupComponent: typeof report.IncomeGroupMonth;
  BudgetTotalsComponent: typeof report.BudgetTotalsMonth;
  IncomeHeaderComponent: typeof report.IncomeHeaderMonth;
};

type RolloverComponents = {
  SummaryComponent: typeof RolloverBudgetSummary;
  ExpenseCategoryComponent: typeof rollover.ExpenseCategoryMonth;
  ExpenseGroupComponent: typeof rollover.ExpenseGroupMonth;
  IncomeCategoryComponent: typeof rollover.IncomeCategoryMonth;
  IncomeGroupComponent: typeof rollover.IncomeGroupMonth;
  BudgetTotalsComponent: typeof rollover.BudgetTotalsMonth;
  IncomeHeaderComponent: typeof rollover.IncomeHeaderMonth;
};

type BudgetInnerProps = {
  accountId?: string;
  reportComponents: ReportComponents;
  rolloverComponents: RolloverComponents;
  titlebar: TitlebarContextValue;
};

function BudgetInner(props: BudgetInnerProps) {
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [_startMonth, setBudgetStartMonthPref] =
    useLocalPref('budget.startMonth');
  const startMonth = _startMonth || currentMonth;
  const [summaryCollapsed, setSummaryCollapsedPref] = useLocalPref(
    'budget.summaryCollapsed',
  );
  const [_budgetType] = useLocalPref('budgetType');
  const budgetType = _budgetType || 'rollover';
  const [_maxMonths] = useGlobalPref('maxMonths');
  const maxMonths = _maxMonths || 1;

  const [initialized, setInitialized] = useState(false);
  const [bounds, setBounds] = useState({
    start: currentMonth,
    end: currentMonth,
  });
  const { grouped: categoryGroups } = useCategories();

  function loadCategories() {
    dispatch(getCategories());
  }

  useEffect(() => {
    const { titlebar } = props;

    async function run() {
      loadCategories();

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

    const unlistens = [
      listen('sync-event', ({ type, tables }) => {
        if (
          type === 'success' &&
          (tables.includes('categories') ||
            tables.includes('category_mapping') ||
            tables.includes('category_groups'))
        ) {
          loadCategories();
        }
      }),

      listen('undo-event', ({ tables }) => {
        if (tables.includes('categories')) {
          loadCategories();
        }
      }),

      titlebar.subscribe(onTitlebarEvent),
    ];

    return () => {
      unlistens.forEach(unlisten => unlisten());
    };
  }, []);

  useEffect(() => {
    send('get-budget-bounds').then(({ start, end }) => {
      if (bounds.start !== start || bounds.end !== end) {
        setBounds({ start, end });
      }
    });
  }, [props.accountId]);

  const onMonthSelect = async (month, numDisplayed) => {
    setBudgetStartMonthPref(month);

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
      setBudgetStartMonthPref(month);
    }
  };

  const categoryNameAlreadyExistsNotification = name => {
    dispatch(
      addNotification({
        type: 'error',
        message: `Category ‘${name}’ already exists in group (May be Hidden)`,
      }),
    );
  };

  const onSaveCategory = async category => {
    const cats = await send('get-categories');
    const exists =
      cats.grouped
        .filter(g => g.id === category.cat_group)[0]
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
        createCategory(
          category.name,
          category.cat_group,
          category.is_income,
          category.hidden,
        ),
      );
    } else {
      dispatch(updateCategory(category));
    }
  };

  const onDeleteCategory = async id => {
    const mustTransfer = await send('must-category-transfer', { id });

    if (mustTransfer) {
      dispatch(
        pushModal('confirm-category-delete', {
          category: id,
          onDelete: transferCategory => {
            if (id !== transferCategory) {
              dispatch(deleteCategory(id, transferCategory));
            }
          },
        }),
      );
    } else {
      dispatch(deleteCategory(id));
    }
  };

  const onSaveGroup = group => {
    if (group.id === 'new') {
      dispatch(createGroup(group.name));
    } else {
      dispatch(updateGroup(group));
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
        pushModal('confirm-category-delete', {
          group: id,
          onDelete: transferCategory => {
            dispatch(deleteGroup(id, transferCategory));
          },
        }),
      );
    } else {
      dispatch(deleteGroup(id));
    }
  };

  const onBudgetAction = (month, type, args) => {
    dispatch(applyBudgetAction(month, type, args));
  };

  const onShowActivity = (categoryId, month) => {
    const conditions = [
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
        conditions,
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

    dispatch(moveCategory(sortInfo.id, sortInfo.groupId, sortInfo.targetId));
  };

  const onReorderGroup = async sortInfo => {
    dispatch(moveCategoryGroup(sortInfo.id, sortInfo.targetId));
  };

  const onToggleCollapse = () => {
    setSummaryCollapsedPref(!summaryCollapsed);
  };

  const onTitlebarEvent = async ({ type, payload }: TitlebarMessage) => {
    switch (type) {
      case SWITCH_BUDGET_MESSAGE_TYPE: {
        await switchBudgetType(
          payload.newBudgetType,
          spreadsheet,
          bounds,
          startMonth,
          async () => {
            dispatch(loadPrefs());
          },
        );
        break;
      }
      default:
    }
  };

  const { reportComponents, rolloverComponents } = props;

  if (!initialized || !categoryGroups) {
    return null;
  }

  let table;
  if (budgetType === 'report') {
    table = (
      <ReportProvider
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
          dataComponents={reportComponents}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
        />
      </ReportProvider>
    );
  } else {
    table = (
      <RolloverProvider
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
          dataComponents={rolloverComponents}
          onMonthSelect={onMonthSelect}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
        />
      </RolloverProvider>
    );
  }

  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(startMonth)}>
      <View style={{ flex: 1 }}>{table}</View>
    </NamespaceContext.Provider>
  );
}

const RolloverBudgetSummary = memo<{ month: string }>(props => {
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  return (
    <rollover.BudgetSummary
      {...props}
      isGoalTemplatesEnabled={isGoalTemplatesEnabled}
    />
  );
});

RolloverBudgetSummary.displayName = 'RolloverBudgetSummary';

export function Budget() {
  const titlebar = useContext(TitlebarContext);

  const reportComponents = useMemo<ReportComponents>(
    () => ({
      SummaryComponent: report.BudgetSummary,
      ExpenseCategoryComponent: report.ExpenseCategoryMonth,
      ExpenseGroupComponent: report.ExpenseGroupMonth,
      IncomeCategoryComponent: report.IncomeCategoryMonth,
      IncomeGroupComponent: report.IncomeGroupMonth,
      BudgetTotalsComponent: report.BudgetTotalsMonth,
      IncomeHeaderComponent: report.IncomeHeaderMonth,
    }),
    [report],
  );

  const rolloverComponents = useMemo<RolloverComponents>(
    () => ({
      SummaryComponent: RolloverBudgetSummary,
      ExpenseCategoryComponent: rollover.ExpenseCategoryMonth,
      ExpenseGroupComponent: rollover.ExpenseGroupMonth,
      IncomeCategoryComponent: rollover.IncomeCategoryMonth,
      IncomeGroupComponent: rollover.IncomeGroupMonth,
      BudgetTotalsComponent: rollover.BudgetTotalsMonth,
      IncomeHeaderComponent: rollover.IncomeHeaderMonth,
    }),
    [rollover],
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
        reportComponents={reportComponents}
        rolloverComponents={rolloverComponents}
        titlebar={titlebar}
      />
    </View>
  );
}
