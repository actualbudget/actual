// @ts-strict-ignore
import React, { useCallback, useEffect, useState } from 'react';

import { sync } from 'loot-core/client/app/appSlice';
import { collapseModals, pushModal } from 'loot-core/client/modals/modalsSlice';
import {
  applyBudgetAction,
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  getCategories,
  moveCategory,
  moveCategoryGroup,
  updateCategory,
  updateGroup,
} from 'loot-core/client/queries/queriesSlice';
import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../../hooks/useCategories';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { useDispatch } from '../../../redux';
import { theme } from '../../../style';
import { prewarmMonth } from '../../budget/util';
import { View } from '../../common/View';
import { NamespaceContext } from '../../spreadsheet/NamespaceContext';
import { SyncRefresh } from '../../SyncRefresh';

import { BudgetTable } from './BudgetTable';

function isBudgetType(input?: string): input is 'rollover' | 'report' {
  return ['rollover', 'report'].includes(input);
}

export function Budget() {
  const { list: categories, grouped: categoryGroups } = useCategories();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = isBudgetType(budgetTypePref) ? budgetTypePref : 'rollover';
  const spreadsheet = useSpreadsheet();

  const currMonth = monthUtils.currentMonth();
  const [startMonth = currMonth, setStartMonthPref] =
    useLocalPref('budget.startMonth');
  const [bounds, setBounds] = useState({
    start: startMonth,
    end: startMonth,
  });
  // const [editMode, setEditMode] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');
  const dispatch = useDispatch();

  useEffect(() => {
    async function init() {
      const { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });

      await prewarmMonth(budgetType, spreadsheet, startMonth);

      setInitialized(true);
    }

    init();

    const unlisten = listen('sync-event', event => {
      if (event.type === 'success') {
        const tables = event.tables;
        if (
          tables.includes('categories') ||
          tables.includes('category_mapping') ||
          tables.includes('category_groups')
        ) {
          // TODO: is this loading every time?
          dispatch(getCategories());
        }
      }
    });

    return () => unlisten();
  }, [budgetType, startMonth, dispatch, spreadsheet]);

  const onBudgetAction = useCallback(
    async (month, type, args) => {
      dispatch(applyBudgetAction({ month, type, args }));
    },
    [dispatch],
  );

  const onShowBudgetSummary = useCallback(() => {
    if (budgetType === 'report') {
      dispatch(
        pushModal({
          name: 'tracking-budget-summary',
          options: {
            month: startMonth,
          },
        }),
      );
    } else {
      dispatch(
        pushModal({
          name: 'envelope-budget-summary',
          options: {
            month: startMonth,
            onBudgetAction,
          },
        }),
      );
    }
  }, [budgetType, dispatch, onBudgetAction, startMonth]);

  const onOpenNewCategoryGroupModal = useCallback(() => {
    dispatch(
      pushModal({
        name: 'new-category-group',
        options: {
          onValidate: name => (!name ? 'Name is required.' : null),
          onSubmit: async name => {
            dispatch(collapseModals({ rootModalName: 'budget-page-menu' }));
            dispatch(createGroup({ name }));
          },
        },
      }),
    );
  }, [dispatch]);

  const onOpenNewCategoryModal = useCallback(
    (groupId, isIncome) => {
      dispatch(
        pushModal({
          name: 'new-category',
          options: {
            onValidate: name => (!name ? 'Name is required.' : null),
            onSubmit: async name => {
              dispatch(
                collapseModals({ rootModalName: 'category-group-menu' }),
              );
              dispatch(
                createCategory({ name, groupId, isIncome, isHidden: false }),
              );
            },
          },
        }),
      );
    },
    [dispatch],
  );

  const onSaveGroup = useCallback(
    group => {
      dispatch(updateGroup({ group }));
    },
    [dispatch],
  );

  const onDeleteGroup = useCallback(
    async groupId => {
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
          pushModal({
            name: 'confirm-category-delete',
            options: {
              group: groupId,
              onDelete: transferCategory => {
                dispatch(
                  collapseModals({ rootModalName: 'category-group-menu' }),
                );
                dispatch(
                  deleteGroup({ id: groupId, transferId: transferCategory }),
                );
              },
            },
          }),
        );
      } else {
        dispatch(collapseModals({ rootModalName: 'category-group-menu' }));
        dispatch(deleteGroup(groupId));
      }
    },
    [categoryGroups, dispatch],
  );

  const onToggleGroupVisibility = useCallback(
    groupId => {
      const group = categoryGroups.find(g => g.id === groupId);
      onSaveGroup({
        ...group,
        hidden: !!!group.hidden,
      });
      dispatch(collapseModals({ rootModalName: 'category-group-menu' }));
    },
    [categoryGroups, dispatch, onSaveGroup],
  );

  const onSaveCategory = useCallback(
    category => {
      dispatch(updateCategory({ category }));
    },
    [dispatch],
  );

  const onDeleteCategory = useCallback(
    async categoryId => {
      const mustTransfer = await send('must-category-transfer', {
        id: categoryId,
      });

      if (mustTransfer) {
        dispatch(
          pushModal({
            name: 'confirm-category-delete',
            options: {
              category: categoryId,
              onDelete: transferCategory => {
                if (categoryId !== transferCategory) {
                  dispatch(collapseModals({ rootModalName: 'category-menu' }));
                  dispatch(
                    deleteCategory({
                      id: categoryId,
                      transferId: transferCategory,
                    }),
                  );
                }
              },
            },
          }),
        );
      } else {
        dispatch(collapseModals({ rootModalName: 'category-menu' }));
        dispatch(deleteCategory({ id: categoryId }));
      }
    },
    [dispatch],
  );

  const onToggleCategoryVisibility = useCallback(
    categoryId => {
      const category = categories.find(c => c.id === categoryId);
      onSaveCategory({
        ...category,
        hidden: !!!category.hidden,
      });
      dispatch(collapseModals({ rootModalName: 'category-menu' }));
    },
    [categories, dispatch, onSaveCategory],
  );

  const onReorderCategory = useCallback(
    (id, { inGroup, aroundCategory }) => {
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
          const idx =
            group?.categories?.findIndex(cat => cat.id === catId) ?? -1;
          catId = group?.categories
            ? idx < group.categories.length - 1
              ? group.categories[idx + 1].id
              : null
            : null;
        }

        groupId = group?.id;
        targetId = catId;
      }

      dispatch(moveCategory({ id, groupId, targetId }));
    },
    [categoryGroups, dispatch],
  );

  const onReorderGroup = useCallback(
    (id, targetId, position) => {
      if (position === 'bottom') {
        const idx = categoryGroups.findIndex(group => group.id === targetId);
        targetId =
          idx < categoryGroups.length - 1 ? categoryGroups[idx + 1].id : null;
      }

      dispatch(moveCategoryGroup({ id, targetId }));
    },
    [categoryGroups, dispatch],
  );

  const onPrevMonth = useCallback(async () => {
    const month = monthUtils.subMonths(startMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    setStartMonthPref(month);
    setInitialized(true);
  }, [budgetType, setStartMonthPref, spreadsheet, startMonth]);

  const onNextMonth = useCallback(async () => {
    const month = monthUtils.addMonths(startMonth, 1);
    await prewarmMonth(budgetType, spreadsheet, month);
    setStartMonthPref(month);
    setInitialized(true);
  }, [budgetType, setStartMonthPref, spreadsheet, startMonth]);

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

  const onSaveNotes = useCallback(async (id, notes) => {
    await send('notes-save', { id, note: notes });
  }, []);

  const onOpenCategoryGroupNotesModal = useCallback(
    id => {
      const group = categoryGroups.find(g => g.id === id);
      dispatch(
        pushModal({
          name: 'notes',
          options: {
            id,
            name: group.name,
            onSave: onSaveNotes,
          },
        }),
      );
    },
    [categoryGroups, dispatch, onSaveNotes],
  );

  const onOpenCategoryNotesModal = useCallback(
    id => {
      const category = categories.find(c => c.id === id);
      dispatch(
        pushModal({
          name: 'notes',
          options: {
            id,
            name: category.name,
            onSave: onSaveNotes,
          },
        }),
      );
    },
    [categories, dispatch, onSaveNotes],
  );

  const onOpenCategoryGroupMenuModal = useCallback(
    id => {
      const group = categoryGroups.find(g => g.id === id);
      dispatch(
        pushModal({
          name: 'category-group-menu',
          options: {
            groupId: group.id,
            onSave: onSaveGroup,
            onAddCategory: onOpenNewCategoryModal,
            onEditNotes: onOpenCategoryGroupNotesModal,
            onDelete: onDeleteGroup,
            onToggleVisibility: onToggleGroupVisibility,
          },
        }),
      );
    },
    [
      categoryGroups,
      dispatch,
      onDeleteGroup,
      onOpenCategoryGroupNotesModal,
      onOpenNewCategoryModal,
      onSaveGroup,
      onToggleGroupVisibility,
    ],
  );

  const onOpenCategoryMenuModal = useCallback(
    id => {
      const category = categories.find(c => c.id === id);
      dispatch(
        pushModal({
          name: 'category-menu',
          options: {
            categoryId: category.id,
            onSave: onSaveCategory,
            onEditNotes: onOpenCategoryNotesModal,
            onDelete: onDeleteCategory,
            onToggleVisibility: onToggleCategoryVisibility,
          },
        }),
      );
    },
    [
      categories,
      dispatch,
      onDeleteCategory,
      onOpenCategoryNotesModal,
      onSaveCategory,
      onToggleCategoryVisibility,
    ],
  );

  const [showHiddenCategories, setShowHiddenCategoriesPref] = useLocalPref(
    'budget.showHiddenCategories',
  );

  const onToggleHiddenCategories = useCallback(() => {
    setShowHiddenCategoriesPref(!showHiddenCategories);
    dispatch(collapseModals({ rootModalName: 'budget-page-menu' }));
  }, [dispatch, setShowHiddenCategoriesPref, showHiddenCategories]);

  const onOpenBudgetMonthNotesModal = useCallback(
    month => {
      dispatch(
        pushModal({
          name: 'notes',
          options: {
            id: `budget-${month}`,
            name: monthUtils.format(month, 'MMMM ‘yy'),
            onSave: onSaveNotes,
          },
        }),
      );
    },
    [dispatch, onSaveNotes],
  );

  const onSwitchBudgetFile = useCallback(() => {
    dispatch(pushModal({ name: 'budget-list' }));
  }, [dispatch]);

  const onOpenBudgetMonthMenu = useCallback(
    month => {
      dispatch(
        pushModal({
          name: `${budgetType === 'report' ? 'tracking' : 'envelope'}-budget-month-menu`,
          options: {
            month,
            onBudgetAction,
            onEditNotes: onOpenBudgetMonthNotesModal,
          },
        }),
      );
    },
    [budgetType, dispatch, onBudgetAction, onOpenBudgetMonthNotesModal],
  );

  const onOpenBudgetPageMenu = useCallback(() => {
    dispatch(
      pushModal({
        name: 'budget-page-menu',
        options: {
          onAddCategoryGroup: onOpenNewCategoryGroupModal,
          onToggleHiddenCategories,
          onSwitchBudgetFile,
        },
      }),
    );
  }, [
    dispatch,
    onOpenNewCategoryGroupModal,
    onSwitchBudgetFile,
    onToggleHiddenCategories,
  ]);

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
