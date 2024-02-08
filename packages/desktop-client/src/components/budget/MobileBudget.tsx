// @ts-strict-ignore
import React, { useEffect, useState } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';

import { type BoundActions, useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { theme } from '../../style';
import { View } from '../common/View';
import { SyncRefresh } from '../SyncRefresh';

import { BudgetTable } from './MobileBudgetTable';
import { prewarmMonth, switchBudgetType } from './util';

type BudgetInnerProps = {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  loadPrefs: BoundActions['loadPrefs'];
  savePrefs: BoundActions['savePrefs'];
  budgetType: 'rollover' | 'report';
  spreadsheet: ReturnType<typeof useSpreadsheet>;
  applyBudgetAction: BoundActions['applyBudgetAction'];
  collapseModals: BoundActions['collapseModals'];
  pushModal: BoundActions['pushModal'];
  getCategories: BoundActions['getCategories'];
  createCategory: BoundActions['createCategory'];
  updateCategory: BoundActions['updateCategory'];
  deleteCategory: BoundActions['deleteCategory'];
  moveCategory: BoundActions['moveCategory'];
  createGroup: BoundActions['createGroup'];
  updateGroup: BoundActions['updateGroup'];
  deleteGroup: BoundActions['deleteGroup'];
  moveCategoryGroup: BoundActions['moveCategoryGroup'];
  sync: BoundActions['sync'];
};

function BudgetInner(props: BudgetInnerProps) {
  const {
    categoryGroups,
    categories,
    loadPrefs,
    budgetType,
    spreadsheet,
    applyBudgetAction,
    collapseModals,
    pushModal,
    createGroup,
    updateGroup,
    deleteGroup,
    moveCategoryGroup,
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
  } = props;

  const currMonth = monthUtils.currentMonth();

  const [bounds, setBounds] = useState({ start: currMonth, end: currMonth });
  const [currentMonth, setCurrentMonth] = useState(currMonth);
  const [initialized, setInitialized] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [numberFormat] = useLocalPref('numberFormat', 'comma-dot');
  const [hideFraction] = useLocalPref('hideFraction', false);

  useEffect(() => {
    async function init() {
      const { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });

      await prewarmMonth(props.budgetType, props.spreadsheet, currentMonth);

      setInitialized(true);
    }

    init();

    const unlisten = listen('sync-event', ({ type, tables }) => {
      if (
        type === 'success' &&
        (tables.includes('categories') ||
          tables.includes('category_mapping') ||
          tables.includes('category_groups'))
      ) {
        // TODO: is this loading every time?
        props.getCategories();
      }
    });

    return () => unlisten();
  }, []);

  const onShowBudgetSummary = () => {
    if (budgetType === 'report') {
      pushModal('report-budget-summary', {
        month: currentMonth,
      });
    } else {
      pushModal('rollover-budget-summary', {
        month: currentMonth,
        onBudgetAction: applyBudgetAction,
      });
    }
  };

  // const onBudgetAction = type => {
  //   applyBudgetAction(currentMonth, type, bounds);
  // };

  const onAddGroup = () => {
    pushModal('new-category-group', {
      onValidate: name => (!name ? 'Name is required.' : null),
      onSubmit: async name => {
        await createGroup(name);
      },
    });
  };

  const onAddCategory = (groupId, isIncome) => {
    pushModal('new-category', {
      onValidate: name => (!name ? 'Name is required.' : null),
      onSubmit: async name => {
        collapseModals('category-group-menu');
        await createCategory(name, groupId, isIncome, false);
      },
    });
  };

  const onSaveGroup = group => {
    updateGroup(group);
  };

  const onDeleteGroup = async groupId => {
    const group = categoryGroups?.find(g => g.id === groupId);

    if (!group) {
      return;
    }

    let mustTransfer = false;
    for (const category of group.categories ?? []) {
      if (await send('must-category-transfer', { id: category.id })) {
        mustTransfer = true;
        break;
      }
    }

    if (mustTransfer) {
      pushModal('confirm-category-delete', {
        group: groupId,
        onDelete: transferCategory => {
          collapseModals('category-group-menu');
          deleteGroup(groupId, transferCategory);
        },
      });
    } else {
      collapseModals('category-group-menu');
      deleteGroup(groupId);
    }
  };

  const onSaveCategory = category => {
    updateCategory(category);
  };

  const onDeleteCategory = async categoryId => {
    const mustTransfer = await send('must-category-transfer', {
      id: categoryId,
    });

    if (mustTransfer) {
      pushModal('confirm-category-delete', {
        category: categoryId,
        onDelete: transferCategory => {
          if (categoryId !== transferCategory) {
            collapseModals('category-menu');
            deleteCategory(categoryId, transferCategory);
          }
        },
      });
    } else {
      collapseModals('category-menu');
      deleteCategory(categoryId);
    }
  };

  const onReorderCategory = (id, { inGroup, aroundCategory }) => {
    let groupId, targetId;

    if (inGroup) {
      groupId = inGroup;
    } else if (aroundCategory) {
      const { id: originalCatId, position } = aroundCategory;

      let catId = originalCatId;
      const group = categoryGroups.find(group =>
        group.categories?.find(cat => cat.id === catId),
      );

      if (position === 'bottom') {
        const idx = group?.categories?.findIndex(cat => cat.id === catId) ?? -1;
        catId = group?.categories
          ? idx < group.categories.length - 1
            ? group.categories[idx + 1].id
            : null
          : null;
      }

      groupId = group?.id;
      targetId = catId;
    }

    moveCategory(id, groupId, targetId);
  };

  const onReorderGroup = (id, targetId, position) => {
    if (position === 'bottom') {
      const idx = categoryGroups.findIndex(group => group.id === targetId);
      targetId =
        idx < categoryGroups.length - 1 ? categoryGroups[idx + 1].id : null;
    }

    moveCategoryGroup(id, targetId);
  };

  const sync = async () => {
    const result = await props.sync();
    if (result?.error) {
      return 'error';
    } else if (result) {
      return 'updated';
    }
    return null;
  };

  const onPrevMonth = async () => {
    const month = monthUtils.subMonths(currentMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    setCurrentMonth(month);
    setInitialized(true);
  };

  const onNextMonth = async () => {
    const month = monthUtils.addMonths(currentMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    setCurrentMonth(month);
    setInitialized(true);
  };

  // const onOpenMonthActionMenu = () => {
  //   const options = [
  //     'Copy last month’s budget',
  //     'Set budgets to zero',
  //     'Set budgets to 3 month average',
  //     budgetType === 'report' && 'Apply to all future budgets',
  //   ].filter(Boolean);

  //   props.showActionSheetWithOptions(
  //     {
  //       options,
  //       cancelButtonIndex: options.length - 1,
  //       title: 'Actions',
  //     },
  //     idx => {
  //       switch (idx) {
  //         case 0:
  //           setEditMode(true);
  //           break;
  //         case 1:
  //           onBudgetAction('copy-last');
  //           break;
  //         case 2:
  //           onBudgetAction('set-zero');
  //           break;
  //         case 3:
  //           onBudgetAction('set-3-avg');
  //           break;
  //         case 4:
  //           if (budgetType === 'report') {
  //             onBudgetAction('set-all-future');
  //           }
  //           break;
  //         default:
  //       }
  //     },
  //   );
  // };

  const onSwitchBudgetType = async () => {
    setInitialized(false);

    const newBudgetType = budgetType === 'rollover' ? 'report' : 'rollover';
    await switchBudgetType(
      newBudgetType,
      spreadsheet,
      bounds,
      currentMonth,
      () => loadPrefs(),
    );

    setInitialized(true);
  };

  const onSaveNotes = async (id, notes) => {
    await send('notes-save', { id, note: notes });
  };

  const onEditGroupNotes = id => {
    const group = categoryGroups.find(g => g.id === id);
    pushModal('notes', {
      id,
      name: group.name,
      onSave: onSaveNotes,
    });
  };

  const onEditCategoryNotes = id => {
    const category = categories.find(c => c.id === id);
    pushModal('notes', {
      id,
      name: category.name,
      onSave: onSaveNotes,
    });
  };

  const onEditGroup = id => {
    const group = categoryGroups.find(g => g.id === id);
    pushModal('category-group-menu', {
      groupId: group.id,
      onSave: onSaveGroup,
      onAddCategory,
      onEditNotes: onEditGroupNotes,
      onDelete: onDeleteGroup,
    });
  };

  const onEditCategory = id => {
    const category = categories.find(c => c.id === id);
    pushModal('category-menu', {
      categoryId: category.id,
      onSave: onSaveCategory,
      onEditNotes: onEditCategoryNotes,
      onDelete: onDeleteCategory,
    });
  };

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
    <SyncRefresh
      onSync={async () => {
        await sync();
      }}
    >
      {({ onRefresh }) => (
        <BudgetTable
          // This key forces the whole table rerender when the number
          // format changes
          key={`${numberFormat}${hideFraction}`}
          categoryGroups={categoryGroups}
          type={budgetType}
          month={currentMonth}
          monthBounds={bounds}
          editMode={editMode}
          onEditMode={flag => setEditMode(flag)}
          onShowBudgetSummary={onShowBudgetSummary}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          onSaveGroup={onSaveGroup}
          onDeleteGroup={onDeleteGroup}
          onAddGroup={onAddGroup}
          onAddCategory={onAddCategory}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
          onOpenMonthActionMenu={() => {}} //onOpenMonthActionMenu}
          onBudgetAction={applyBudgetAction}
          onRefresh={onRefresh}
          onSwitchBudgetType={onSwitchBudgetType}
          pushModal={pushModal}
          onEditGroup={onEditGroup}
          onEditCategory={onEditCategory}
        />
      )}
    </SyncRefresh>
  );
}

export function Budget() {
  const { list: categories, grouped: categoryGroups } = useCategories();
  const [budgetType] = useLocalPref('budgetType', 'rollover');

  const actions = useActions();
  const spreadsheet = useSpreadsheet();
  useSetThemeColor(theme.mobileViewTheme);
  return (
    <BudgetInner
      categoryGroups={categoryGroups}
      categories={categories}
      budgetType={budgetType}
      {...actions}
      spreadsheet={spreadsheet}
    />
  );
}
