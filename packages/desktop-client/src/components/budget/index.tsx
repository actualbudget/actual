// @ts-strict-ignore
import React, {
  memo,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { useSelector } from 'react-redux';
import {
  type NavigateFunction,
  type PathMatch,
  useLocation,
  useMatch,
} from 'react-router-dom';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { type QueriesState } from 'loot-core/src/client/state-types/queries';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import {
  addCategory,
  moveCategory,
  moveCategoryGroup,
  updateCategory,
  deleteCategory,
  addGroup,
  updateGroup,
  deleteGroup,
} from 'loot-core/src/shared/categories';
import * as monthUtils from 'loot-core/src/shared/months';
import { type GlobalPrefs, type LocalPrefs } from 'loot-core/src/types/prefs';

import { type BoundActions, useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useNavigate } from '../../hooks/useNavigate';
import { styles } from '../../style';
import { View } from '../common/View';
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
import { RolloverContext } from './rollover/RolloverContext';
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

type BudgetProps = {
  accountId?: string;
  startMonth: LocalPrefs['budget.startMonth'];
  collapsedPrefs: LocalPrefs['budget.collapsed'];
  summaryCollapsed: LocalPrefs['budget.summaryCollapsed'];
  budgetType: LocalPrefs['budgetType'];
  maxMonths: GlobalPrefs['maxMonths'];
  categoryGroups: QueriesState['categories']['grouped'];
  reportComponents: ReportComponents;
  rolloverComponents: RolloverComponents;
  titlebar: TitlebarContextValue;
  match: PathMatch<string>;
  spreadsheet: ReturnType<typeof useSpreadsheet>;
  navigate: NavigateFunction;
  getCategories: BoundActions['getCategories'];
  savePrefs: BoundActions['savePrefs'];
  createCategory: BoundActions['createCategory'];
  updateCategory: BoundActions['updateCategory'];
  pushModal: BoundActions['pushModal'];
  deleteCategory: BoundActions['deleteCategory'];
  createGroup: BoundActions['createGroup'];
  updateGroup: BoundActions['updateGroup'];
  deleteGroup: BoundActions['deleteGroup'];
  applyBudgetAction: BoundActions['applyBudgetAction'];
  moveCategory: BoundActions['moveCategory'];
  moveCategoryGroup: BoundActions['moveCategoryGroup'];
  loadPrefs: BoundActions['loadPrefs'];
  addNotification: BoundActions['addNotification'];
};

function BudgetInner(props: BudgetProps) {
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
    const result = await props.getCategories();
    setCategoryGroups(result.grouped);
  }

  useEffect(() => {
    const { titlebar, budgetType } = props;

    async function run() {
      loadCategories();

      const { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });

      await prewarmAllMonths(
        budgetType,
        props.spreadsheet,
        { start, end },
        prewarmStartMonth,
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
      await prewarmMonth(
        props.budgetType,
        props.spreadsheet,
        monthUtils.subMonths(month, 1),
      );
    } else if (month > startMonth) {
      // pre-warm next month
      await prewarmMonth(
        props.budgetType,
        props.spreadsheet,
        monthUtils.addMonths(month, numDisplayed),
      );
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

  const categoryNameAlreadyExistsNotification = name => {
    props.addNotification({
      type: 'error',
      message: `Category ‘${name}’ already exists in group (May be Hidden)`,
    });
  };

  const onSaveCategory = async category => {
    const exists =
      (await props.getCategories()).grouped
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
      const id = await props.createCategory(
        category.name,
        category.cat_group,
        category.is_income,
        category.hidden,
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

  const groupNameAlreadyExistsNotification = group => {
    props.addNotification({
      type: 'error',
      message: `Group ‘${group.name}’ already exists in budget ${group.hidden ? '(May be Hidden)' : ''}`,
    });
  };

  const onSaveGroup = async group => {
    const categories = await props.getCategories();
    const matchingGroups = categories.grouped
      .filter(g => g.name.toUpperCase() === group.name.toUpperCase())
      .filter(g => group.id === 'new' || group.id !== g.id);

    if (matchingGroups.length > 0) {
      groupNameAlreadyExistsNotification(matchingGroups[0]);
      return;
    }

    if (group.id === 'new') {
      const id = await props.createGroup(group.name);
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
    const group = categoryGroups.find(g => g.id === id);

    let mustTransfer = false;
    for (const category of group.categories) {
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
    const cats = await props.getCategories();
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
    const collapsed = !summaryCollapsed;
    setSummaryCollapsed(collapsed);
    props.savePrefs({ 'budget.summaryCollapsed': collapsed });
  };

  const onTitlebarEvent = async ({ type, payload }: TitlebarMessage) => {
    switch (type) {
      case SWITCH_BUDGET_MESSAGE_TYPE: {
        await switchBudgetType(
          payload.newBudgetType,
          props.spreadsheet,
          bounds,
          prewarmStartMonth,
          () => props.loadPrefs(),
        );
        break;
      }
      default:
    }
  };

  const {
    maxMonths: originalMaxMonths,
    budgetType: type,
    reportComponents,
    rolloverComponents,
  } = props;

  const maxMonths = originalMaxMonths || 1;

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

const RolloverBudgetSummary = memo<{ month: string }>(props => {
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  return (
    <rollover.BudgetSummary
      {...props}
      isGoalTemplatesEnabled={isGoalTemplatesEnabled}
    />
  );
});

export function Budget() {
  const startMonth = useSelector(
    state => state.prefs.local['budget.startMonth'],
  );
  const collapsedPrefs = useSelector(
    state => state.prefs.local['budget.collapsed'],
  );
  const summaryCollapsed = useSelector(
    state => state.prefs.local['budget.summaryCollapsed'],
  );
  const budgetType = useSelector(
    state => state.prefs.local.budgetType || 'rollover',
  );
  const maxMonths = useSelector(state => state.prefs.global.maxMonths);
  const { grouped: categoryGroups } = useCategories();

  const actions = useActions();
  const spreadsheet = useSpreadsheet();
  const titlebar = useContext(TitlebarContext);
  const location = useLocation();
  const match = useMatch(location.pathname);
  const navigate = useNavigate();

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
