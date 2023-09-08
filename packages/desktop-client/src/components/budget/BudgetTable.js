import React, { createRef, Component } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { styles } from '../../style';
import View from '../common/View';
import { IntersectionBoundary } from '../tooltips';

import BudgetCategories from './BudgetCategories';
import BudgetSummaries from './BudgetSummaries';
import BudgetTotals from './BudgetTotals';
import { MonthsProvider } from './MonthsContext';
import { findSortDown, findSortUp, getScrollbarWidth } from './util';

class BudgetTable extends Component {
  constructor(props) {
    super(props);
    this.budgetCategoriesRef = createRef();

    this.state = {
      editing: null,
      draggingState: null,
      showHiddenCategories: props.prefs['budget.showHiddenCategories'] ?? false,
    };
  }

  onEditMonth = (id, monthIndex) => {
    this.setState({ editing: id ? { id, cell: monthIndex } : null });
  };

  onEditName = id => {
    this.setState({ editing: id ? { id, cell: 'name' } : null });
  };

  onReorderCategory = (id, dropPos, targetId) => {
    let { categoryGroups } = this.props;

    let isGroup = !!categoryGroups.find(g => g.id === targetId);

    if (isGroup) {
      let { targetId: groupId } = findSortUp(categoryGroups, dropPos, targetId);
      let group = categoryGroups.find(g => g.id === groupId);

      if (group) {
        let { categories } = group;
        this.props.onReorderCategory({
          id,
          groupId: group.id,
          targetId:
            categories.length === 0 || dropPos === 'top'
              ? null
              : categories[0].id,
        });
      }
    } else {
      let targetGroup;

      for (let group of categoryGroups) {
        if (group.categories.find(cat => cat.id === targetId)) {
          targetGroup = group;
          break;
        }
      }

      this.props.onReorderCategory({
        id,
        groupId: targetGroup.id,
        ...findSortDown(targetGroup.categories, dropPos, targetId),
      });
    }
  };

  onReorderGroup = (id, dropPos, targetId) => {
    let { categoryGroups } = this.props;

    this.props.onReorderGroup({
      id,
      ...findSortDown(categoryGroups, dropPos, targetId),
    });
  };

  moveVertically = dir => {
    let { editing } = this.state;
    let { type, categoryGroups, collapsed } = this.props;

    const flattened = categoryGroups.reduce((all, group) => {
      if (collapsed.includes(group.id)) {
        return all.concat({ id: group.id, isGroup: true });
      }
      return all.concat([{ id: group.id, isGroup: true }, ...group.categories]);
    }, []);

    if (editing) {
      const idx = flattened.findIndex(item => item.id === editing.id);
      let nextIdx = idx + dir;

      while (nextIdx >= 0 && nextIdx < flattened.length) {
        const next = flattened[nextIdx];

        if (next.isGroup) {
          nextIdx += dir;
          continue;
        } else if (type === 'report' || !next.is_income) {
          this.onEditMonth(next.id, editing.cell);
          return;
        } else {
          break;
        }
      }
    }
  };

  onKeyDown = e => {
    if (!this.state.editing) {
      return null;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      this.moveVertically(e.shiftKey ? -1 : 1);
    }
  };

  onShowActivity = (catName, catId, monthIndex) => {
    this.props.onShowActivity(catName, catId, this.resolveMonth(monthIndex));
  };

  onBudgetAction = (monthIndex, type, args) => {
    this.props.onBudgetAction(this.resolveMonth(monthIndex), type, args);
  };

  resolveMonth = monthIndex => {
    return monthUtils.addMonths(this.props.startMonth, monthIndex);
  };

  clearEditing() {
    this.setState({ editing: null });
  }

  toggleHiddenCategories = () => {
    this.setState(prevState => ({
      showHiddenCategories: !prevState.showHiddenCategories,
    }));
    this.props.savePrefs({
      'budget.showHiddenCategories': !this.state.showHiddenCategories,
    });
  };

  expandAllCategories = () => {
    this.props.setCollapsed([]);
  };

  collapseAllCategories = () => {
    let { setCollapsed, categoryGroups } = this.props;
    setCollapsed(categoryGroups.map(g => g.id));
  };

  render() {
    let {
      type,
      categoryGroups,
      prewarmStartMonth,
      startMonth,
      numMonths,
      monthBounds,
      collapsed,
      setCollapsed,
      newCategoryForGroup,
      dataComponents,
      isAddingGroup,
      onSaveCategory,
      onSaveGroup,
      onDeleteCategory,
      onDeleteGroup,
      onShowNewCategory,
      onHideNewCategory,
      onShowNewGroup,
      onHideNewGroup,
    } = this.props;
    let { editing, draggingState, showHiddenCategories } = this.state;

    return (
      <View
        data-testid="budget-table"
        style={{
          flex: 1,
          ...(styles.lightScrollbar && {
            '& ::-webkit-scrollbar': {
              backgroundColor: 'transparent',
            },
            '& ::-webkit-scrollbar-thumb:vertical': {
              backgroundColor: 'white',
            },
          }),
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            overflow: 'hidden',
            flexShrink: 0,
            // This is necessary to align with the table because the
            // table has this padding to allow the shadow to show
            paddingLeft: 5,
            paddingRight: 5 + getScrollbarWidth(),
          }}
        >
          <View style={{ width: 200 }} />
          <MonthsProvider
            startMonth={prewarmStartMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            type={type}
          >
            <BudgetSummaries
              SummaryComponent={dataComponents.SummaryComponent}
            />
          </MonthsProvider>
        </View>

        <MonthsProvider
          startMonth={startMonth}
          numMonths={numMonths}
          monthBounds={monthBounds}
          type={type}
        >
          <BudgetTotals
            MonthComponent={dataComponents.BudgetTotalsComponent}
            toggleHiddenCategories={this.toggleHiddenCategories}
            expandAllCategories={this.expandAllCategories}
            collapseAllCategories={this.collapseAllCategories}
          />
          <IntersectionBoundary.Provider value={this.budgetCategoriesRef}>
            <View
              style={{
                overflowY: 'scroll',
                overflowAnchor: 'none',
                flex: 1,
                paddingLeft: 5,
                paddingRight: 5,
              }}
              innerRef={this.budgetCategoriesRef}
            >
              <View
                style={{
                  opacity: draggingState ? 0.5 : 1,
                  flexShrink: 0,
                }}
                onKeyDown={this.onKeyDown}
                innerRef={el => (this.budgetDataNode = el)}
              >
                <BudgetCategories
                  showHiddenCategories={showHiddenCategories}
                  categoryGroups={categoryGroups}
                  newCategoryForGroup={newCategoryForGroup}
                  isAddingGroup={isAddingGroup}
                  editingCell={editing}
                  collapsed={collapsed}
                  setCollapsed={setCollapsed}
                  dataComponents={dataComponents}
                  onEditMonth={this.onEditMonth}
                  onEditName={this.onEditName}
                  onSaveCategory={onSaveCategory}
                  onSaveGroup={onSaveGroup}
                  onDeleteCategory={onDeleteCategory}
                  onDeleteGroup={onDeleteGroup}
                  onReorderCategory={this.onReorderCategory}
                  onReorderGroup={this.onReorderGroup}
                  onShowNewCategory={onShowNewCategory}
                  onHideNewCategory={onHideNewCategory}
                  onShowNewGroup={onShowNewGroup}
                  onHideNewGroup={onHideNewGroup}
                  onBudgetAction={this.onBudgetAction}
                  onShowActivity={this.onShowActivity}
                />
              </View>
            </View>
          </IntersectionBoundary.Provider>
        </MonthsProvider>
      </View>
    );
  }
}

export default BudgetTable;
