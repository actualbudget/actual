import React, {
  memo,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import {
  addCategory,
  updateCategory,
  moveCategory,
  moveCategoryGroup,
  deleteCategory,
  addGroup,
  updateGroup,
  deleteGroup,
} from 'loot-core/src/shared/categories';
import * as monthUtils from 'loot-core/src/shared/months';

import { useActions } from '../../hooks/useActions';
import useCategories from '../../hooks/useCategories';
import useFeatureFlag from '../../hooks/useFeatureFlag';
import { styles } from '../../style';
import View from '../common/View';
import { TitlebarContext } from '../Titlebar';

import DynamicBudgetTable from './DynamicBudgetTable';
import { getValidMonthBounds } from './MonthsContext';
import * as report from './report/components';
import { ReportProvider } from './report/ReportContext';
import * as rollover from './rollover/rollover-components';
import { RolloverContext } from './rollover/RolloverContext';

function Budget(props) {
  const currentMonth = monthUtils.currentMonth();
  const tableRef = useRef(null);

  const [initialized, setInitialized] = useState(false);
  const [prewarmStartMonth, setPrewarmStartMonth] = useState(
    props.startMonth || currentMonth,
  );

  const [newCategoryForGroup, setNewCategoryForGroup] = useState(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [collapsed, setCollapsed] = useState(props.collapsedPrefs || []);
  const [bounds, setBounds] = useState({
    start: currentMonth,
    end: currentMonth,
  });
  const [categoryGroups, setCategoryGroups] = useState(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(
    props.summaryCollapsed,
  );

  async function loadCategories() {
    let result = await props.getCategories();
    setCategoryGroups(result.grouped);
  }

  useEffect(() => {
    let { titlebar, budgetType } = props;

    async function run() {
      loadCategories();

      let { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });

      prewarmAllMonths({ start, end }, budgetType);
    }

    run();

    let unlistens = [
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
        if (tableRef.current) {
          // g dammit
          // We need to clear the editing cell, otherwise when
          // the user navigates away from the page they will
          // accidentally clear the undo stack if they have pressed
          // undo, since the cell will save itself on blur (worst case:
          // undo takes you to another screen and then you can't redo
          // any of the budget changes)
          tableRef.current.clearEditing();
        }

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
    props.savePrefs({ 'budget.collapsed': collapsed });
  }, [collapsed]);

  useEffect(() => {
    send('get-budget-bounds').then(({ start, end }) => {
      if (bounds.start !== start || bounds.end !== end) {
        setBounds({ start, end });
      }
    });
  }, [props.accountId]);

  const prewarmMonth = async (month, type = null) => {
    type = type || props.budgetType;

    let method =
      type === 'report' ? 'report-budget-month' : 'rollover-budget-month';

    let values = await send(method, { month });

    for (let value of values) {
      props.spreadsheet.prewarmCache(value.name, value);
    }
  };

  async function prewarmAllMonths(bounds, type = null) {
    let numMonths = 3;

    const startMonth = props.startMonth || currentMonth;

    bounds = getValidMonthBounds(
      bounds,
      monthUtils.subMonths(startMonth, 1),
      monthUtils.addMonths(startMonth, numMonths + 1),
    );
    let months = monthUtils.rangeInclusive(bounds.start, bounds.end);

    await Promise.all(months.map(month => prewarmMonth(month, type)));

    setInitialized(true);
  }

  const onMonthSelect = async (month, numDisplayed) => {
    setPrewarmStartMonth(month);

    const warmingMonth = month;

    const startMonth = props.startMonth || currentMonth;

    // We could be smarter about this, but this is a good start. We
    // optimize for the case where users press the left/right button
    // to move between months. This loads the month data all at once
    // and "prewarms" the spreadsheet cache. This uses a simple
    // heuristic that will fail if the user clicks an arbitrary month,
    // but it will just load in some unnecessary data.
    if (month < startMonth) {
      // pre-warm prev month
      await prewarmMonth(monthUtils.subMonths(month, 1));
    } else if (month > startMonth) {
      // pre-warm next month
      await prewarmMonth(monthUtils.addMonths(month, numDisplayed));
    }

    if (warmingMonth === month) {
      props.savePrefs({ 'budget.startMonth': month });
    }
  };

  const onShowNewCategory = groupId => {
    setNewCategoryForGroup(groupId);
    setCollapsed(state => state.filter(c => c !== groupId));
  };

  const onHideNewCategory = () => {
    setNewCategoryForGroup(null);
  };

  const onShowNewGroup = () => {
    setIsAddingGroup(true);
  };

  const onHideNewGroup = () => {
    setIsAddingGroup(false);
  };

  const onSaveCategory = async category => {
    if (category.id === 'new') {
      let id = await props.createCategory(
        category.name,
        category.cat_group,
        category.is_income,
      );

      setNewCategoryForGroup(null);
      setCategoryGroups(state =>
        addCategory(state, {
          ...category,
          is_income: category.is_income ? 1 : 0,
          id,
        }),
      );
    } else {
      props.updateCategory(category);
      setCategoryGroups(state => updateCategory(state, category));
    }
  };

  const onDeleteCategory = async id => {
    const mustTransfer = await send('must-category-transfer', { id });

    if (mustTransfer) {
      props.pushModal('confirm-category-delete', {
        category: id,
        onDelete: transferCategory => {
          if (id !== transferCategory) {
            props.deleteCategory(id, transferCategory);

            setCategoryGroups(state => deleteCategory(state, id));
          }
        },
      });
    } else {
      props.deleteCategory(id);

      setCategoryGroups(state => deleteCategory(state, id));
    }
  };

  const onSaveGroup = async group => {
    if (group.id === 'new') {
      let id = await props.createGroup(group.name);
      setIsAddingGroup(false);
      setCategoryGroups(state =>
        addGroup(state, {
          ...group,
          is_income: 0,
          categories: group.categories || [],
          id,
        }),
      );
    } else {
      props.updateGroup(group);
      setCategoryGroups(state => updateGroup(state, group));
    }
  };

  const onDeleteGroup = async id => {
    let group = categoryGroups.find(g => g.id === id);

    let mustTransfer = false;
    for (let category of group.categories) {
      if (await send('must-category-transfer', { id: category.id })) {
        mustTransfer = true;
        break;
      }
    }

    if (mustTransfer) {
      props.pushModal('confirm-category-delete', {
        group: id,
        onDelete: transferCategory => {
          props.deleteGroup(id, transferCategory);

          setCategoryGroups(state => deleteGroup(state, id));
        },
      });
    } else {
      props.deleteGroup(id);

      setCategoryGroups(state => deleteGroup(state, id));
    }
  };

  const onBudgetAction = (month, type, args) => {
    props.applyBudgetAction(month, type, args);
  };

  const onShowActivity = (categoryName, categoryId, month) => {
    props.navigate('/accounts', {
      state: {
        goBack: true,
        filterName: `${categoryName} (${monthUtils.format(
          month,
          'MMMM yyyy',
        )})`,
        filter: {
          category: categoryId,
          date: { $transform: '$month', $eq: month },
        },
      },
    });
  };

  const onReorderCategory = async sortInfo => {
    props.moveCategory(sortInfo.id, sortInfo.groupId, sortInfo.targetId);
    setCategoryGroups(state =>
      moveCategory(state, sortInfo.id, sortInfo.groupId, sortInfo.targetId),
    );
  };

  const onReorderGroup = async sortInfo => {
    props.moveCategoryGroup(sortInfo.id, sortInfo.targetId);
    setCategoryGroups(state =>
      moveCategoryGroup(state, sortInfo.id, sortInfo.targetId),
    );
  };

  const onToggleCollapse = () => {
    let collapsed = !summaryCollapsed;
    setSummaryCollapsed(collapsed);
    props.savePrefs({ 'budget.summaryCollapsed': collapsed });
  };

  const onTitlebarEvent = async msg => {
    switch (msg) {
      case 'budget/switch-type': {
        let type = props.budgetType;
        let newType = type === 'rollover' ? 'report' : 'rollover';

        props.spreadsheet.disableObservers();
        await send('budget-set-type', { type: newType });
        await prewarmAllMonths(bounds, newType);
        props.spreadsheet.enableObservers();
        props.loadPrefs();
        break;
      }
      default:
    }
  };

  let {
    maxMonths,
    budgetType: type,
    reportComponents,
    rolloverComponents,
  } = props;

  maxMonths = maxMonths || 1;

  if (!initialized || !categoryGroups) {
    return null;
  }

  const startMonth = props.startMonth || currentMonth;

  let table;
  if (type === 'report') {
    table = (
      <ReportProvider
        summaryCollapsed={summaryCollapsed}
        onBudgetAction={onBudgetAction}
        onToggleSummaryCollapse={onToggleCollapse}
      >
        <DynamicBudgetTable
          ref={tableRef}
          type={type}
          categoryGroups={categoryGroups}
          prewarmStartMonth={prewarmStartMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          newCategoryForGroup={newCategoryForGroup}
          isAddingGroup={isAddingGroup}
          dataComponents={reportComponents}
          onMonthSelect={onMonthSelect}
          onShowNewCategory={onShowNewCategory}
          onHideNewCategory={onHideNewCategory}
          onShowNewGroup={onShowNewGroup}
          onHideNewGroup={onHideNewGroup}
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
      <RolloverContext
        categoryGroups={categoryGroups}
        summaryCollapsed={summaryCollapsed}
        onBudgetAction={onBudgetAction}
        onToggleSummaryCollapse={onToggleCollapse}
      >
        <DynamicBudgetTable
          ref={tableRef}
          type={type}
          categoryGroups={categoryGroups}
          prewarmStartMonth={prewarmStartMonth}
          startMonth={startMonth}
          monthBounds={bounds}
          maxMonths={maxMonths}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          newCategoryForGroup={newCategoryForGroup}
          isAddingGroup={isAddingGroup}
          dataComponents={rolloverComponents}
          onMonthSelect={onMonthSelect}
          onShowNewCategory={onShowNewCategory}
          onHideNewCategory={onHideNewCategory}
          onShowNewGroup={onShowNewGroup}
          onHideNewGroup={onHideNewGroup}
          onDeleteCategory={onDeleteCategory}
          onDeleteGroup={onDeleteGroup}
          onSaveCategory={onSaveCategory}
          onSaveGroup={onSaveGroup}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
        />
      </RolloverContext>
    );
  }

  return <View style={{ flex: 1 }}>{table}</View>;
}

const RolloverBudgetSummary = memo(props => {
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  return (
    <rollover.BudgetSummary
      {...props}
      isGoalTemplatesEnabled={isGoalTemplatesEnabled}
    />
  );
});

export default function BudgetWrapper(props) {
  let startMonth = useSelector(state => state.prefs.local['budget.startMonth']);
  let collapsedPrefs = useSelector(
    state => state.prefs.local['budget.collapsed'],
  );
  let summaryCollapsed = useSelector(
    state => state.prefs.local['budget.summaryCollapsed'],
  );
  let budgetType = useSelector(
    state => state.prefs.local.budgetType || 'rollover',
  );
  let maxMonths = useSelector(state => state.prefs.global.maxMonths);
  let { grouped: categoryGroups } = useCategories();

  let actions = useActions();
  let spreadsheet = useSpreadsheet();
  let titlebar = useContext(TitlebarContext);
  let location = useLocation();
  let match = useMatch(location.pathname);
  let navigate = useNavigate();

  let reportComponents = useMemo(
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

  let rolloverComponents = useMemo(
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
      <Budget
        startMonth={startMonth}
        collapsedPrefs={collapsedPrefs}
        summaryCollapsed={summaryCollapsed}
        budgetType={budgetType}
        maxMonths={maxMonths}
        categoryGroups={categoryGroups}
        {...actions}
        reportComponents={reportComponents}
        rolloverComponents={rolloverComponents}
        spreadsheet={spreadsheet}
        titlebar={titlebar}
        navigate={navigate}
        match={match}
      />
    </View>
  );
}
