import React, { Component } from 'react';
import { useSelector } from 'react-redux';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import {
  addCategory,
  addGroup,
  deleteCategory,
  deleteGroup,
  moveCategory,
  moveCategoryGroup,
  updateCategory,
  updateGroup,
} from 'loot-core/src/shared/categories';
import * as monthUtils from 'loot-core/src/shared/months';

import { useActions } from '../../hooks/useActions';
import useCategories from '../../hooks/useCategories';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import AnimatedLoading from '../../icons/AnimatedLoading';
import { theme } from '../../style';
import View from '../common/View';
import SyncRefresh from '../SyncRefresh';

import { BudgetTable } from './MobileBudgetTable';
import { prewarmMonth, switchBudgetType } from './util';

class Budget extends Component {
  constructor(props) {
    super(props);

    const currentMonth = monthUtils.currentMonth();
    this.state = {
      bounds: { start: currentMonth, end: currentMonth },
      currentMonth,
      initialized: false,
      editMode: false,
      categoryGroups: [],
    };
  }

  async loadCategories() {
    const result = await this.props.getCategories();
    this.setState({ categoryGroups: result.grouped });
  }

  async componentDidMount() {
    // let removeBlur = this.props.navigation.addListener('didBlur', () => {
    //   this.setState({ editMode: false });
    // });

    this.loadCategories();

    const { start, end } = await send('get-budget-bounds');
    this.setState({ bounds: { start, end } });

    await prewarmMonth(
      this.props.budgetType,
      this.props.spreadsheet,
      this.state.currentMonth,
    );

    this.setState({ initialized: true });

    const unlisten = listen('sync-event', ({ type, tables }) => {
      if (
        type === 'success' &&
        (tables.includes('categories') ||
          tables.includes('category_mapping') ||
          tables.includes('category_groups'))
      ) {
        // TODO: is this loading every time?
        this.loadCategories();
      }
    });

    this.cleanup = () => {
      //   removeBlur();
      unlisten();
    };
  }

  componentWillUnmount() {
    this.cleanup?.();
  }

  onShowBudgetSummary = () => {
    if (this.props.budgetType === 'report') {
      this.props.pushModal('report-budget-summary', {
        month: this.state.currentMonth,
      });
    } else {
      this.props.pushModal('rollover-budget-summary', {
        month: this.state.currentMonth,
        onBudgetAction: this.props.applyBudgetAction,
      });
    }
  };

  onBudgetAction = type => {
    const { currentMonth } = this.state;
    this.props.applyBudgetAction(currentMonth, type, this.state.bounds);
  };

  onAddGroup = () => {
    this.props.pushModal('new-category-group', {
      onValidate: name => (!name ? 'Name is required.' : null),
      onSubmit: async name => {
        const id = await this.props.createGroup(name);
        this.setState(state => ({
          categoryGroups: addGroup(state.categoryGroups, {
            id,
            name,
            categories: [],
            is_income: 0,
          }),
        }));
      },
    });
  };

  onAddCategory = (groupId, isIncome) => {
    this.props.pushModal('new-category', {
      onValidate: name => (!name ? 'Name is required.' : null),
      onSubmit: async name => {
        const id = await this.props.createCategory(name, groupId, isIncome);
        this.setState(state => ({
          categoryGroups: addCategory(state.categoryGroups, {
            id,
            name,
            cat_group: groupId,
            is_income: isIncome ? 1 : 0,
          }),
        }));
      },
    });
  };

  onSaveGroup = group => {
    this.props.updateGroup(group);
    this.setState(state => ({
      categoryGroups: updateGroup(state.categoryGroups, group),
    }));
  };

  onDeleteGroup = async groupId => {
    const group = this.state.categoryGroups?.find(g => g.id === groupId);

    if (!group) {
      return;
    }

    let mustTransfer = false;
    for (const category of group.categories) {
      if (await send('must-category-transfer', { id: category.id })) {
        mustTransfer = true;
        break;
      }
    }

    if (mustTransfer) {
      this.props.pushModal('confirm-category-delete', {
        group: groupId,
        onDelete: transferCategory => {
          this.props.deleteGroup(groupId, transferCategory);
          this.setState(state => ({
            categoryGroups: deleteGroup(state.categoryGroups, groupId),
          }));
        },
      });
    } else {
      this.props.deleteGroup(groupId);
      this.setState(state => ({
        categoryGroups: deleteGroup(state.categoryGroups, groupId),
      }));
    }
  };

  onSaveCategory = category => {
    this.props.updateCategory(category);
    this.setState(state => ({
      categoryGroups: updateCategory(state.categoryGroups, category),
    }));
  };

  onDeleteCategory = async categoryId => {
    const mustTransfer = await send('must-category-transfer', {
      id: categoryId,
    });

    if (mustTransfer) {
      this.props.pushModal('confirm-category-delete', {
        category: categoryId,
        onDelete: transferCategory => {
          if (categoryId !== transferCategory) {
            this.props.deleteCategory(categoryId, transferCategory);
            this.setState(state => ({
              categoryGroups: deleteCategory(state.categoryGroups, categoryId),
            }));
          }
        },
      });
    } else {
      this.props.deleteCategory(categoryId);
      this.setState(state => ({
        categoryGroups: deleteCategory(state.categoryGroups, categoryId),
      }));
    }
  };

  onReorderCategory = (id, { inGroup, aroundCategory }) => {
    const { categoryGroups } = this.state;
    let groupId, targetId;

    if (inGroup) {
      groupId = inGroup;
    } else if (aroundCategory) {
      const { id: originalCatId, position } = aroundCategory;

      let catId = originalCatId;
      const group = categoryGroups.find(group =>
        group.categories.find(cat => cat.id === catId),
      );

      if (position === 'bottom') {
        const { categories } = group;
        const idx = categories.findIndex(cat => cat.id === catId);
        catId = idx < categories.length - 1 ? categories[idx + 1].id : null;
      }

      groupId = group.id;
      targetId = catId;
    }

    this.props.moveCategory(id, groupId, targetId);

    this.setState({
      categoryGroups: moveCategory(categoryGroups, id, groupId, targetId),
    });
  };

  onReorderGroup = (id, targetId, position) => {
    const { categoryGroups } = this.state;

    if (position === 'bottom') {
      const idx = categoryGroups.findIndex(group => group.id === targetId);
      targetId =
        idx < categoryGroups.length - 1 ? categoryGroups[idx + 1].id : null;
    }

    this.props.moveCategoryGroup(id, targetId);

    this.setState({
      categoryGroups: moveCategoryGroup(categoryGroups, id, targetId),
    });
  };

  sync = async () => {
    const { updated, error } = await this.props.sync();
    if (error) {
      return 'error';
    } else if (updated) {
      return 'updated';
    }
    return null;
  };

  onPrevMonth = async () => {
    const { spreadsheet, budgetType } = this.props;
    const month = monthUtils.subMonths(this.state.currentMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    this.setState({ currentMonth: month, initialized: true });
  };

  onNextMonth = async () => {
    const { spreadsheet, budgetType } = this.props;
    const month = monthUtils.addMonths(this.state.currentMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    this.setState({ currentMonth: month, initialized: true });
  };

  onOpenActionSheet = () => {
    const { budgetType } = this.props;

    const options = [
      'Edit Categories',
      'Copy last month’s budget',
      'Set budgets to zero',
      'Set budgets to 3 month average',
      budgetType === 'report' && 'Apply to all future budgets',
      'Cancel',
    ].filter(Boolean);

    this.props.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title: 'Actions',
      },
      idx => {
        switch (idx) {
          case 0:
            this.setState({ editMode: true });
            break;
          case 1:
            this.onBudgetAction('copy-last');
            break;
          case 2:
            this.onBudgetAction('set-zero');
            break;
          case 3:
            this.onBudgetAction('set-3-avg');
            break;
          case 4:
            if (budgetType === 'report') {
              this.onBudgetAction('set-all-future');
            }
            break;
          default:
        }
      },
    );
  };

  onSwitchBudgetType = async () => {
    const { spreadsheet, budgetType, loadPrefs } = this.props;
    const { bounds, currentMonth } = this.state;

    this.setState({ initialized: false });

    const newBudgetType = budgetType === 'rollover' ? 'report' : 'rollover';
    await switchBudgetType(
      newBudgetType,
      spreadsheet,
      bounds,
      currentMonth,
      () => loadPrefs(),
    );

    this.setState({ initialized: true });
  };

  render() {
    const { currentMonth, bounds, editMode, initialized } = this.state;
    const {
      categories,
      categoryGroups,
      prefs,
      savePrefs,
      budgetType,
      navigation,
      applyBudgetAction,
      pushModal,
    } = this.props;
    const numberFormat = prefs.numberFormat || 'comma-dot';
    const hideFraction = prefs.hideFraction || false;

    if (!categoryGroups || !initialized) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.mobilePageBackground,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 25,
          }}
        >
          <AnimatedLoading width={25} height={25} />
        </View>
      );
    }

    return (
      <SyncRefresh onSync={this.sync}>
        {({ refreshing, onRefresh }) => (
          <BudgetTable
            // This key forces the whole table rerender when the number
            // format changes
            key={numberFormat + hideFraction}
            categories={categories}
            categoryGroups={categoryGroups}
            type={budgetType}
            month={currentMonth}
            monthBounds={bounds}
            navigation={navigation}
            //   refreshControl={
            //     <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            //   }
            editMode={editMode}
            onEditMode={flag => this.setState({ editMode: flag })}
            onShowBudgetSummary={this.onShowBudgetSummary}
            onPrevMonth={this.onPrevMonth}
            onNextMonth={this.onNextMonth}
            onSaveGroup={this.onSaveGroup}
            onDeleteGroup={this.onDeleteGroup}
            onAddGroup={this.onAddGroup}
            onAddCategory={this.onAddCategory}
            onSaveCategory={this.onSaveCategory}
            onDeleteCategory={this.onDeleteCategory}
            onReorderCategory={this.onReorderCategory}
            onReorderGroup={this.onReorderGroup}
            onOpenActionSheet={() => {}} //this.onOpenActionSheet}
            onBudgetAction={applyBudgetAction}
            onRefresh={onRefresh}
            onSwitchBudgetType={this.onSwitchBudgetType}
            savePrefs={savePrefs}
            pushModal={pushModal}
          />
        )}
      </SyncRefresh>
    );
  }
}

export default function BudgetWrapper() {
  const { list: categories, grouped: categoryGroups } = useCategories();
  const budgetType = useSelector(
    state => state.prefs.local.budgetType || 'rollover',
  );
  const prefs = useSelector(state => state.prefs.local);

  const actions = useActions();
  const spreadsheet = useSpreadsheet();
  useSetThemeColor(theme.mobileViewTheme);
  return (
    <Budget
      categoryGroups={categoryGroups}
      categories={categories}
      budgetType={budgetType}
      prefs={prefs}
      {...actions}
      spreadsheet={spreadsheet}
    />
  );
}
