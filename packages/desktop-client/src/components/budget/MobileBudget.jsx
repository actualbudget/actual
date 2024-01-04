import React, { Component } from 'react';
import { useSelector } from 'react-redux';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useActions } from '../../hooks/useActions';
import useCategories from '../../hooks/useCategories';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import AnimatedLoading from '../../icons/AnimatedLoading';
import { theme } from '../../style';
import { View } from '../common/View';
import { SyncRefresh } from '../SyncRefresh';

import { BudgetTable } from './MobileBudgetTable';
import { prewarmMonth, switchBudgetType } from './util';

const CATEGORY_BUDGET_EDIT_ACTION = 'category-budget';
const BALANCE_MENU_OPEN_ACTION = 'balance-menu';

class BudgetInner extends Component {
  constructor(props) {
    super(props);

    const currentMonth = monthUtils.currentMonth();
    this.state = {
      bounds: { start: currentMonth, end: currentMonth },
      currentMonth,
      initialized: false,
      editMode: false,
      editingBudgetCategoryId: null,
      openBalanceActionMenuId: null,
    };
  }

  async loadCategories() {
    await this.props.getCategories();
  }

  async componentDidMount() {
    // let removeBlur = this.props.navigation.addListener('didBlur', () => {
    //   this.setState({ editMode: false });
    // });

    const { start, end } = await send('get-budget-bounds');
    await prewarmMonth(
      this.props.budgetType,
      this.props.spreadsheet,
      this.state.currentMonth,
    );

    this.setState({
      bounds: { start, end },
      initialized: true,
    });

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
        await this.props.createGroup(name);
      },
    });
  };

  onAddCategory = (groupId, isIncome) => {
    this.props.pushModal('new-category', {
      onValidate: name => (!name ? 'Name is required.' : null),
      onSubmit: async name => {
        this.props.collapseModals('category-group-menu');
        await this.props.createCategory(name, groupId, isIncome);
      },
    });
  };

  onSaveGroup = group => {
    this.props.updateGroup(group);
  };

  onDeleteGroup = async groupId => {
    const { categoryGroups } = this.props;
    const group = categoryGroups?.find(g => g.id === groupId);

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
          this.props.collapseModals('category-group-menu');
          this.props.deleteGroup(groupId, transferCategory);
        },
      });
    } else {
      this.props.collapseModals('category-group-menu');
      this.props.deleteGroup(groupId);
    }
  };

  onSaveCategory = category => {
    this.props.updateCategory(category);
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
            this.props.collapseModals('category-menu');
            this.props.deleteCategory(categoryId, transferCategory);
          }
        },
      });
    } else {
      this.props.collapseModals('category-menu');
      this.props.deleteCategory(categoryId);
    }
  };

  onReorderCategory = (id, { inGroup, aroundCategory }) => {
    const { categoryGroups } = this.props;
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
  };

  onReorderGroup = (id, targetId, position) => {
    const { categoryGroups } = this.props;

    if (position === 'bottom') {
      const idx = categoryGroups.findIndex(group => group.id === targetId);
      targetId =
        idx < categoryGroups.length - 1 ? categoryGroups[idx + 1].id : null;
    }

    this.props.moveCategoryGroup(id, targetId);
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

  onOpenMonthActionMenu = () => {
    const { budgetType } = this.props;

    const options = [
      'Copy last month’s budget',
      'Set budgets to zero',
      'Set budgets to 3 month average',
      budgetType === 'report' && 'Apply to all future budgets',
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

  onSaveNotes = async (id, notes) => {
    await send('notes-save', { id, note: notes });
  };

  onEditGroupNotes = id => {
    const { categoryGroups } = this.props;
    const group = categoryGroups.find(g => g.id === id);
    this.props.pushModal('notes', {
      id,
      name: group.name,
      onSave: this.onSaveNotes,
    });
  };

  onEditCategoryNotes = id => {
    const { categories } = this.props;
    const category = categories.find(c => c.id === id);
    this.props.pushModal('notes', {
      id,
      name: category.name,
      onSave: this.onSaveNotes,
    });
  };

  onEditGroup = id => {
    const { categoryGroups } = this.props;
    const group = categoryGroups.find(g => g.id === id);
    this.props.pushModal('category-group-menu', {
      groupId: group.id,
      onSave: this.onSaveGroup,
      onAddCategory: this.onAddCategory,
      onEditNotes: this.onEditGroupNotes,
      onDelete: this.onDeleteGroup,
    });
  };

  onEditCategory = id => {
    const { categories } = this.props;
    const category = categories.find(c => c.id === id);
    this.props.pushModal('category-menu', {
      categoryId: category.id,
      onSave: this.onSaveCategory,
      onEditNotes: this.onEditCategoryNotes,
      onDelete: this.onDeleteCategory,
    });
  };

  onEditCategoryBudget = id => {
    this.onEdit(CATEGORY_BUDGET_EDIT_ACTION, id);
  };

  onOpenBalanceActionMenu = id => {
    this.onEdit(BALANCE_MENU_OPEN_ACTION, id);
  };

  onEdit = (action, id) => {
    const { editingBudgetCategoryId, openBalanceActionMenuId } = this.state;

    // Do not allow editing if another field is currently being edited.
    // Cancel the currently editing field in that case.
    const currentlyEditing = editingBudgetCategoryId || openBalanceActionMenuId;

    this.setState({
      editingBudgetCategoryId:
        action === CATEGORY_BUDGET_EDIT_ACTION && !currentlyEditing ? id : null,
      openBalanceActionMenuId:
        action === BALANCE_MENU_OPEN_ACTION && !currentlyEditing ? id : null,
    });

    return { action, editingId: !currentlyEditing ? id : null };
  };

  render() {
    const {
      currentMonth,
      bounds,
      editMode,
      initialized,
      editingBudgetCategoryId,
      openBalanceActionMenuId,
    } = this.state;
    const {
      categoryGroups,
      categories,
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
            categoryGroups={categoryGroups}
            categories={categories}
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
            onOpenMonthActionMenu={this.onOpenMonthActionMenu}
            onBudgetAction={applyBudgetAction}
            onRefresh={onRefresh}
            onSwitchBudgetType={this.onSwitchBudgetType}
            onSaveNotes={this.onSaveNotes}
            onEditGroupNotes={this.onEditGroupNotes}
            onEditCategoryNotes={this.onEditCategoryNotes}
            savePrefs={savePrefs}
            pushModal={pushModal}
            onEditGroup={this.onEditGroup}
            onEditCategory={this.onEditCategory}
            editingBudgetCategoryId={editingBudgetCategoryId}
            onEditCategoryBudget={this.onEditCategoryBudget}
            openBalanceActionMenuId={openBalanceActionMenuId}
            onOpenBalanceActionMenu={this.onOpenBalanceActionMenu}
          />
        )}
      </SyncRefresh>
    );
  }
}

export function Budget() {
  const { list: categories, grouped: categoryGroups } = useCategories();
  const budgetType = useSelector(
    state => state.prefs.local.budgetType || 'rollover',
  );
  const prefs = useSelector(state => state.prefs.local);

  const actions = useActions();
  const spreadsheet = useSpreadsheet();
  useSetThemeColor(theme.mobileViewTheme);
  return (
    <BudgetInner
      categoryGroups={categoryGroups}
      categories={categories}
      budgetType={budgetType}
      prefs={prefs}
      {...actions}
      spreadsheet={spreadsheet}
    />
  );
}
