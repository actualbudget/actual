// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  applyBudgetAction,
  collapseModals,
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  getCategories,
  moveCategory,
  moveCategoryGroup,
  pushModal,
  updateCategory,
  updateGroup,
  sync,
  loadPrefs,
} from 'loot-core/client/actions';
import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useSetThemeColor } from '../../../hooks/useSetThemeColor';
import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { theme } from '../../../style';
import { prewarmMonth, switchBudgetType } from '../../budget/util';
import { View } from '../../common/View';
import { NamespaceContext } from '../../spreadsheet/NamespaceContext';
import { SyncRefresh } from '../../SyncRefresh';

import { BudgetTable } from './BudgetTable';

type BudgetInnerProps = {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  budgetType: 'rollover' | 'report';
  spreadsheet: ReturnType<typeof useSpreadsheet>;
};

function BudgetInner(props: BudgetInnerProps) {
  const { categoryGroups, categories, budgetType, spreadsheet } = props;

  const currMonth = monthUtils.currentMonth();
  const [startMonth = currMonth, setStartMonthPref] =
    useLocalPref('budget.startMonth');
  const [bounds, setBounds] = useState({
    start: startMonth,
    end: startMonth,
  });
  const [initialized, setInitialized] = useState(false);
  // const [editMode, setEditMode] = useState(false);

  const [_numberFormat] = useLocalPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction = false] = useLocalPref('hideFraction');
  const dispatch = useDispatch();

  useEffect(() => {
    async function init() {
      const { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });

      await prewarmMonth(budgetType, spreadsheet, startMonth);

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
        dispatch(getCategories());
      }
    });

    return () => unlisten();
  }, [budgetType, startMonth, dispatch, spreadsheet]);

  const onBudgetAction = async (month, type, args) => {
    dispatch(applyBudgetAction(month, type, args));
  };

  const onShowBudgetSummary = () => {
    if (budgetType === 'report') {
      dispatch(
        pushModal('report-budget-summary', {
          month: startMonth,
        }),
      );
    } else {
      dispatch(
        pushModal('rollover-budget-summary', {
          month: startMonth,
          onBudgetAction,
        }),
      );
    }
  };

  const onOpenNewCategoryGroupModal = () => {
    dispatch(
      pushModal('new-category-group', {
        onValidate: name => (!name ? 'Name is required.' : null),
        onSubmit: async name => {
          dispatch(collapseModals('budget-page-menu'));
          dispatch(createGroup(name));
        },
      }),
    );
  };

  const onOpenNewCategoryModal = (groupId, isIncome) => {
    dispatch(
      pushModal('new-category', {
        onValidate: name => (!name ? 'Name is required.' : null),
        onSubmit: async name => {
          dispatch(collapseModals('category-group-menu'));
          dispatch(createCategory(name, groupId, isIncome, false));
        },
      }),
    );
  };

  const onSaveGroup = group => {
    dispatch(updateGroup(group));
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
      dispatch(
        pushModal('confirm-category-delete', {
          group: groupId,
          onDelete: transferCategory => {
            dispatch(collapseModals('category-group-menu'));
            dispatch(deleteGroup(groupId, transferCategory));
          },
        }),
      );
    } else {
      dispatch(collapseModals('category-group-menu'));
      dispatch(deleteGroup(groupId));
    }
  };

  const onSaveCategory = category => {
    dispatch(updateCategory(category));
  };

  const onDeleteCategory = async categoryId => {
    const mustTransfer = await send('must-category-transfer', {
      id: categoryId,
    });

    if (mustTransfer) {
      dispatch(
        pushModal('confirm-category-delete', {
          category: categoryId,
          onDelete: transferCategory => {
            if (categoryId !== transferCategory) {
              dispatch(collapseModals('category-menu'));
              dispatch(deleteCategory(categoryId, transferCategory));
            }
          },
        }),
      );
    } else {
      dispatch(collapseModals('category-menu'));
      dispatch(deleteCategory(categoryId));
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

    dispatch(moveCategory(id, groupId, targetId));
  };

  const onReorderGroup = (id, targetId, position) => {
    if (position === 'bottom') {
      const idx = categoryGroups.findIndex(group => group.id === targetId);
      targetId =
        idx < categoryGroups.length - 1 ? categoryGroups[idx + 1].id : null;
    }

    dispatch(moveCategoryGroup(id, targetId));
  };

  const onPrevMonth = async () => {
    const month = monthUtils.subMonths(startMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    setStartMonthPref(month);
    setInitialized(true);
  };

  const onNextMonth = async () => {
    const month = monthUtils.addMonths(startMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    setStartMonthPref(month);
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
      startMonth,
      async () => {
        dispatch(loadPrefs());
      },
    );

    setInitialized(true);
  };

  const onSaveNotes = async (id, notes) => {
    await send('notes-save', { id, note: notes });
  };

  const onOpenCategoryGroupNotesModal = id => {
    const group = categoryGroups.find(g => g.id === id);
    dispatch(
      pushModal('notes', {
        id,
        name: group.name,
        onSave: onSaveNotes,
      }),
    );
  };

  const onOpenCategoryNotesModal = id => {
    const category = categories.find(c => c.id === id);
    dispatch(
      pushModal('notes', {
        id,
        name: category.name,
        onSave: onSaveNotes,
      }),
    );
  };

  const onOpenCategoryGroupMenuModal = id => {
    const group = categoryGroups.find(g => g.id === id);
    dispatch(
      pushModal('category-group-menu', {
        groupId: group.id,
        onSave: onSaveGroup,
        onAddCategory: onOpenNewCategoryModal,
        onEditNotes: onOpenCategoryGroupNotesModal,
        onDelete: onDeleteGroup,
      }),
    );
  };

  const onOpenCategoryMenuModal = id => {
    const category = categories.find(c => c.id === id);
    dispatch(
      pushModal('category-menu', {
        categoryId: category.id,
        onSave: onSaveCategory,
        onEditNotes: onOpenCategoryNotesModal,
        onDelete: onDeleteCategory,
        onBudgetAction,
      }),
    );
  };

  const onOpenSwitchBudgetTypeModal = () => {
    dispatch(
      pushModal('switch-budget-type', {
        onSwitch: () => {
          onSwitchBudgetType();
          dispatch(collapseModals('budget-page-menu'));
        },
      }),
    );
  };

  const [showHiddenCategories, setShowHiddenCategoriesPref] = useLocalPref(
    'budget.showHiddenCategories',
  );

  const onToggleHiddenCategories = () => {
    setShowHiddenCategoriesPref(!showHiddenCategories);
    dispatch(collapseModals('budget-page-menu'));
  };

  const onOpenBudgetMonthNotesModal = month => {
    dispatch(
      pushModal('notes', {
        id: `budget-${month}`,
        name: monthUtils.format(month, 'MMMM ‘yy'),
        onSave: onSaveNotes,
      }),
    );
  };

  const onSwitchBudgetFile = () => {
    dispatch(pushModal('budget-list'));
  };

  const onOpenBudgetMonthMenu = month => {
    dispatch(
      pushModal(`${budgetType}-budget-month-menu`, {
        month,
        onBudgetAction,
        onEditNotes: onOpenBudgetMonthNotesModal,
      }),
    );
  };

  const onOpenBudgetPageMenu = () => {
    dispatch(
      pushModal('budget-page-menu', {
        onAddCategoryGroup: onOpenNewCategoryGroupModal,
        onToggleHiddenCategories,
        onSwitchBudgetFile,
        onSwitchBudgetType: onOpenSwitchBudgetTypeModal,
      }),
    );
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
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(startMonth)}>
      <SyncRefresh
        onSync={async () => {
          dispatch(sync());
        }}
      >
        {({ onRefresh }) => (
          <BudgetTable
            // This key forces the whole table rerender when the number
            // format changes
            key={`${numberFormat}${hideFraction}`}
            categoryGroups={categoryGroups}
            type={budgetType}
            month={startMonth}
            monthBounds={bounds}
            // editMode={editMode}
            onShowBudgetSummary={onShowBudgetSummary}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onSaveGroup={onSaveGroup}
            onDeleteGroup={onDeleteGroup}
            onAddCategory={onOpenNewCategoryModal}
            onSaveCategory={onSaveCategory}
            onDeleteCategory={onDeleteCategory}
            onReorderCategory={onReorderCategory}
            onReorderGroup={onReorderGroup}
            onBudgetAction={onBudgetAction}
            onRefresh={onRefresh}
            onEditGroup={onOpenCategoryGroupMenuModal}
            onEditCategory={onOpenCategoryMenuModal}
            onOpenBudgetPageMenu={onOpenBudgetPageMenu}
            onOpenBudgetMonthMenu={onOpenBudgetMonthMenu}
          />
        )}
      </SyncRefresh>
    </NamespaceContext.Provider>
  );
}

export function Budget() {
  const { list: categories, grouped: categoryGroups } = useCategories();
  const [_budgetType] = useLocalPref('budgetType');
  const budgetType = _budgetType || 'rollover';
  const spreadsheet = useSpreadsheet();
  useSetThemeColor(theme.mobileViewTheme);
  return (
    <BudgetInner
      categoryGroups={categoryGroups}
      categories={categories}
      budgetType={budgetType}
      spreadsheet={spreadsheet}
    />
  );
}
