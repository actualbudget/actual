import React, { useContext, useMemo } from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import {
  addCategory,
  updateCategory,
  moveCategory,
  moveCategoryGroup,
  deleteCategory,
  addGroup,
  updateGroup,
  deleteGroup
} from 'loot-core/src/shared/categories.js';
import * as monthUtils from 'loot-core/src/shared/months';
import DynamicBudgetTable from 'loot-design/src/components/budget/DynamicBudgetTable';
import { getValidMonthBounds } from 'loot-design/src/components/budget/MonthsContext';
import * as report from 'loot-design/src/components/budget/report/components';
import { ReportProvider } from 'loot-design/src/components/budget/report/ReportContext';
import * as rollover from 'loot-design/src/components/budget/rollover/rollover-components';
import { RolloverContext } from 'loot-design/src/components/budget/rollover/RolloverContext';
import { View } from 'loot-design/src/components/common';
import SpreadsheetContext from 'loot-design/src/components/spreadsheet/SpreadsheetContext';
import { styles } from 'loot-design/src/style';

import { TitlebarContext } from '../Titlebar';

let _initialBudgetMonth = null;

class Budget extends React.PureComponent {
  constructor(props) {
    super(props);

    const currentMonth = _initialBudgetMonth || monthUtils.currentMonth();
    this.state = {
      initialized: false,
      prewarmStartMonth: currentMonth,
      startMonth: currentMonth,
      newCategoryForGroup: null,
      isAddingGroup: false,
      collapsed: props.collapsedPrefs || [],
      bounds: { start: currentMonth, end: currentMonth },
      categoryGroups: null,
      summaryCollapsed: props.summaryCollapsed
    };
  }

  async loadCategories() {
    let result = await this.props.getCategories();
    this.setState({ categoryGroups: result.grouped });
  }

  async componentDidMount() {
    let { titlebar, budgetType } = this.props;
    this.loadCategories();

    let { start, end } = await send('get-budget-bounds');
    this.setState({ bounds: { start, end } });

    this.prewarmAllMonths({ start, end }, budgetType);

    let unlistens = [
      listen('sync-event', ({ type, tables }) => {
        if (
          type === 'success' &&
          (tables.includes('categories') ||
            tables.includes('category_mapping') ||
            tables.includes('category_groups'))
        ) {
          this.loadCategories();
        }
      }),

      listen('undo-event', ({ tables }) => {
        if (this.table) {
          // g dammit
          // We need to clear the editing cell, otherwise when
          // the user navigates away from the page they will
          // accidentally clear the undo stack if they have pressed
          // undo, since the cell will save itself on blur (worst case:
          // undo takes you to another screen and then you can't redo
          // any of the budget changes)
          this.table.clearEditing();
        }

        if (tables.includes('categories')) {
          this.loadCategories();
        }
      }),

      titlebar.subscribe(this.onTitlebarEvent)
    ];

    this.cleanup = () => {
      unlistens.forEach(unlisten => unlisten());
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.collapsed !== this.state.collapsed) {
      this.props.savePrefs({ 'budget.collapsed': this.state.collapsed });
    }

    if (prevState.startMonth !== this.state.startMonth) {
      // Save it off into a global state so if the component re-mounts
      // we keep this state (but don't need to subscribe to it)
      _initialBudgetMonth = this.state.startMonth;
    }

    if (this.props.match && !prevProps.match) {
      // Make to sure to check if the budget bounds have changed, and
      // if so reload the budget data
      send('get-budget-bounds').then(({ start, end }) => {
        let { bounds } = this.state;
        if (bounds.start !== start || bounds.end !== end) {
          this.setState({ bounds: { start, end } });
        }
      });
    }
  }

  componentWillUnmount() {
    if (this.cleanup) {
      this.cleanup();
    }
  }

  prewarmMonth = async (month, type = null) => {
    type = type || this.props.budgetType;

    let method =
      type === 'report' ? 'report-budget-month' : 'rollover-budget-month';

    let values = await send(method, { month });

    for (let value of values) {
      this.props.spreadsheet.prewarmCache(value.name, value);
    }
  };

  async prewarmAllMonths(bounds, type = null) {
    let { startMonth } = this.state;
    let numMonths = 3;

    bounds = getValidMonthBounds(
      bounds,
      monthUtils.subMonths(startMonth, 1),
      monthUtils.addMonths(startMonth, numMonths + 1)
    );
    let months = monthUtils.rangeInclusive(bounds.start, bounds.end);

    await Promise.all(months.map(month => this.prewarmMonth(month, type)));

    this.setState({ initialized: true });
  }

  onMonthSelect = async (month, numDisplayed) => {
    let { startMonth } = this.state;

    this.setState({ prewarmStartMonth: month });

    this.warmingMonth = month;

    // We could be smarter about this, but this is a good start. We
    // optimize for the case where users press the left/right button
    // to move between months. This loads the month data all at once
    // and "prewarms" the spreadsheet cache. This uses a simple
    // heuristic that will fail if the user clicks an arbitrary month,
    // but it will just load in some unnecessary data.
    if (month < startMonth) {
      // pre-warm prev month
      await this.prewarmMonth(monthUtils.subMonths(month, 1));
    } else if (month > startMonth) {
      // pre-warm next month
      await this.prewarmMonth(monthUtils.addMonths(month, numDisplayed));
    }

    if (this.warmingMonth === month) {
      this.setState({ startMonth: month });
    }
  };

  onShowNewCategory = groupId => {
    this.setState({
      newCategoryForGroup: groupId,
      collapsed: this.state.collapsed.filter(c => c !== groupId)
    });
  };

  onHideNewCategory = () => {
    this.setState({ newCategoryForGroup: null });
  };

  onShowNewGroup = () => {
    this.setState({ isAddingGroup: true });
  };

  onHideNewGroup = () => {
    this.setState({ isAddingGroup: false });
  };

  setCollapsed = collapsed => {
    this.setState({ collapsed });
  };

  onCopy(month) {
    this.props.copyPreviousMonthInto(month, this.props.categories);
  }

  onSaveCategory = async category => {
    let { categoryGroups } = this.state;

    if (category.id === 'new') {
      let id = await this.props.createCategory(
        category.name,
        category.cat_group,
        category.is_income
      );

      this.setState({
        newCategoryForGroup: null,
        categoryGroups: addCategory(categoryGroups, {
          ...category,
          is_income: category.is_income ? 1 : 0,
          id
        })
      });
    } else {
      this.props.updateCategory(category);

      this.setState({
        categoryGroups: updateCategory(categoryGroups, category)
      });
    }
  };

  onDeleteCategory = async id => {
    const mustTransfer = await send('must-category-transfer', { id });
    let { categoryGroups } = this.state;

    if (mustTransfer) {
      this.props.pushModal('confirm-category-delete', {
        category: id,
        onDelete: transferCategory => {
          if (id !== transferCategory) {
            this.props.deleteCategory(id, transferCategory);

            this.setState({
              categoryGroups: deleteCategory(categoryGroups, id)
            });
          }
        }
      });
    } else {
      this.props.deleteCategory(id);

      this.setState({
        categoryGroups: deleteCategory(categoryGroups, id)
      });
    }
  };

  onSaveGroup = async group => {
    let { categoryGroups } = this.state;

    if (group.id === 'new') {
      let id = await this.props.createGroup(group.name);
      this.setState({
        isAddingGroup: false,
        categoryGroups: addGroup(categoryGroups, {
          ...group,
          is_income: 0,
          categories: group.categories || [],
          id
        })
      });
    } else {
      this.props.updateGroup(group);
      this.setState({
        categoryGroups: updateGroup(categoryGroups, group)
      });
    }
  };

  onDeleteGroup = async id => {
    let { categoryGroups } = this.state;
    let group = categoryGroups.find(g => g.id === id);

    let mustTransfer = false;
    for (let category of group.categories) {
      if (await send('must-category-transfer', { id: category.id })) {
        mustTransfer = true;
        break;
      }
    }

    if (mustTransfer) {
      this.props.pushModal('confirm-category-delete', {
        group: id,
        onDelete: transferCategory => {
          this.props.deleteGroup(id, transferCategory);

          this.setState({
            categoryGroups: deleteGroup(categoryGroups, id)
          });
        }
      });
    } else {
      this.props.deleteGroup(id);

      this.setState({
        categoryGroups: deleteGroup(categoryGroups, id)
      });
    }
  };

  onBudgetAction = (month, type, args) => {
    this.props.applyBudgetAction(month, type, args);
  };

  onShowActivity = (categoryName, categoryId, month) => {
    this.props.history.push({
      pathname: '/accounts',
      state: {
        goBack: true,
        filterName: `${categoryName} (${monthUtils.format(
          month,
          'MMMM yyyy'
        )})`,
        filter: {
          category: categoryId,
          date: { $transform: '$month', $eq: month }
        }
      }
    });
  };

  onReorderCategory = async sortInfo => {
    let { categoryGroups } = this.state;

    this.props.moveCategory(sortInfo.id, sortInfo.groupId, sortInfo.targetId);
    this.setState({
      categoryGroups: moveCategory(
        categoryGroups,
        sortInfo.id,
        sortInfo.groupId,
        sortInfo.targetId
      )
    });
  };

  onReorderGroup = async sortInfo => {
    let { categoryGroups } = this.state;

    this.props.moveCategoryGroup(sortInfo.id, sortInfo.targetId);
    this.setState({
      categoryGroups: moveCategoryGroup(
        categoryGroups,
        sortInfo.id,
        sortInfo.targetId
      )
    });
  };

  onToggleCollapse = () => {
    let collapsed = !this.state.summaryCollapsed;
    this.setState({ summaryCollapsed: collapsed });
    this.props.savePrefs({ 'budget.summaryCollapsed': collapsed });
  };

  onTitlebarEvent = async msg => {
    switch (msg) {
      case 'budget/switch-type': {
        let type = this.props.budgetType;
        let newType = type === 'rollover' ? 'report' : 'rollover';

        this.props.spreadsheet.disableObservers();
        await send('budget-set-type', { type: newType });
        await this.prewarmAllMonths(this.state.bounds, newType);
        this.props.spreadsheet.enableObservers();
        this.props.loadPrefs();
        break;
      }
      default:
    }
  };

  render() {
    let {
      maxMonths,
      budgetType: type,
      reportComponents,
      rolloverComponents
    } = this.props;
    let {
      initialized,
      categoryGroups,
      prewarmStartMonth,
      startMonth,
      newCategoryForGroup,
      isAddingGroup,
      collapsed,
      summaryCollapsed,
      bounds
    } = this.state;

    maxMonths = maxMonths || 1;

    if (!initialized || !categoryGroups) {
      return null;
    }

    let table;
    if (type === 'report') {
      table = (
        <ReportProvider
          summaryCollapsed={summaryCollapsed}
          onBudgetAction={this.onBudgetAction}
          onToggleSummaryCollapse={this.onToggleCollapse}
        >
          <DynamicBudgetTable
            ref={el => (this.table = el)}
            type={type}
            categoryGroups={categoryGroups}
            prewarmStartMonth={prewarmStartMonth}
            startMonth={startMonth}
            monthBounds={bounds}
            maxMonths={maxMonths}
            collapsed={collapsed}
            setCollapsed={this.setCollapsed}
            newCategoryForGroup={newCategoryForGroup}
            isAddingGroup={isAddingGroup}
            dataComponents={reportComponents}
            onMonthSelect={this.onMonthSelect}
            onShowNewCategory={this.onShowNewCategory}
            onHideNewCategory={this.onHideNewCategory}
            onShowNewGroup={this.onShowNewGroup}
            onHideNewGroup={this.onHideNewGroup}
            onDeleteCategory={this.onDeleteCategory}
            onDeleteGroup={this.onDeleteGroup}
            onSaveCategory={this.onSaveCategory}
            onSaveGroup={this.onSaveGroup}
            onBudgetAction={this.onBudgetAction}
            onShowActivity={this.onShowActivity}
            onReorderCategory={this.onReorderCategory}
            onReorderGroup={this.onReorderGroup}
          />
        </ReportProvider>
      );
    } else {
      table = (
        <RolloverContext
          categoryGroups={categoryGroups}
          summaryCollapsed={summaryCollapsed}
          onBudgetAction={this.onBudgetAction}
          onToggleSummaryCollapse={this.onToggleCollapse}
        >
          <DynamicBudgetTable
            ref={el => (this.table = el)}
            type={type}
            categoryGroups={categoryGroups}
            prewarmStartMonth={prewarmStartMonth}
            startMonth={startMonth}
            monthBounds={bounds}
            maxMonths={maxMonths}
            collapsed={collapsed}
            setCollapsed={this.setCollapsed}
            newCategoryForGroup={newCategoryForGroup}
            isAddingGroup={isAddingGroup}
            dataComponents={rolloverComponents}
            onMonthSelect={this.onMonthSelect}
            onShowNewCategory={this.onShowNewCategory}
            onHideNewCategory={this.onHideNewCategory}
            onShowNewGroup={this.onShowNewGroup}
            onHideNewGroup={this.onHideNewGroup}
            onDeleteCategory={this.onDeleteCategory}
            onDeleteGroup={this.onDeleteGroup}
            onSaveCategory={this.onSaveCategory}
            onSaveGroup={this.onSaveGroup}
            onBudgetAction={this.onBudgetAction}
            onShowActivity={this.onShowActivity}
            onReorderCategory={this.onReorderCategory}
            onReorderGroup={this.onReorderGroup}
          />
        </RolloverContext>
      );
    }

    return (
      <View style={{ flex: 1 }} innerRef={el => (this.page = el)}>
        {table}
      </View>
    );
  }
}

function BudgetWrapper(props) {
  let spreadsheet = useContext(SpreadsheetContext);
  let titlebar = useContext(TitlebarContext);

  let reportComponents = useMemo(
    () => ({
      SummaryComponent: report.BudgetSummary,
      ExpenseCategoryComponent: report.ExpenseCategoryMonth,
      ExpenseGroupComponent: report.ExpenseGroupMonth,
      IncomeCategoryComponent: report.IncomeCategoryMonth,
      IncomeGroupComponent: report.IncomeGroupMonth,
      BudgetTotalsComponent: report.BudgetTotalsMonth,
      IncomeHeaderComponent: report.IncomeHeaderMonth
    }),
    [report]
  );

  let rolloverComponents = useMemo(
    () => ({
      SummaryComponent: rollover.BudgetSummary,
      ExpenseCategoryComponent: rollover.ExpenseCategoryMonth,
      ExpenseGroupComponent: rollover.ExpenseGroupMonth,
      IncomeCategoryComponent: rollover.IncomeCategoryMonth,
      IncomeGroupComponent: rollover.IncomeGroupMonth,
      BudgetTotalsComponent: rollover.BudgetTotalsMonth,
      IncomeHeaderComponent: rollover.IncomeHeaderMonth
    }),
    [rollover]
  );

  // In a previous iteration, the wrapper needs `overflow: hidden` for
  // some reason. Without it at certain dimensions the width/height
  // that autosizer gives us is slightly wrong, causing scrollbars to
  // appear. We might not need it anymore?
  return (
    <View
      style={[
        styles.page,
        { paddingLeft: 8, paddingRight: 8, overflow: 'hidden' }
      ]}
    >
      <Budget
        {...props}
        reportComponents={reportComponents}
        rolloverComponents={rolloverComponents}
        spreadsheet={spreadsheet}
        titlebar={titlebar}
      />
    </View>
  );
}

export default connect(
  state => ({
    collapsedPrefs: state.prefs.local['budget.collapsed'],
    summaryCollapsed: state.prefs.local['budget.summaryCollapsed'],
    budgetType: state.prefs.local.budgetType || 'rollover',
    maxMonths: state.prefs.global.maxMonths,
    categoryGroups: state.queries.categories.grouped
  }),
  actions
)(BudgetWrapper);
