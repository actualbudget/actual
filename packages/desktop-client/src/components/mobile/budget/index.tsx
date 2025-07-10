// @ts-strict-ignore
import React, { useCallback, useEffect, useState } from 'react';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';

import { BudgetTable } from './BudgetTable';

import { sync } from '@desktop-client/app/appSlice';
import { prewarmMonth } from '@desktop-client/components/budget/util';
import { SyncRefresh } from '@desktop-client/components/SyncRefresh';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { collapseModals, pushModal } from '@desktop-client/modals/modalsSlice';
import {
  applyBudgetAction,
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  updateCategory,
  updateGroup,
} from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

function isBudgetType(input?: string): input is 'envelope' | 'tracking' {
  return ['envelope', 'tracking'].includes(input);
}

export function Budget() {
  const locale = useLocale();
  const { list: categories, grouped: categoryGroups } = useCategories();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = isBudgetType(budgetTypePref) ? budgetTypePref : 'envelope';
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
  }, [budgetType, startMonth, dispatch, spreadsheet]);

  const onBudgetAction = useCallback(
    async (month, type, args) => {
      dispatch(applyBudgetAction({ month, type, args }));
    },
    [dispatch],
  );

  const onShowBudgetSummary = useCallback(() => {
    if (budgetType === 'tracking') {
      dispatch(
        pushModal({
          modal: {
            name: 'tracking-budget-summary',
            options: {
              month: startMonth,
            },
          },
        }),
      );
    } else {
      dispatch(
        pushModal({
          modal: {
            name: 'envelope-budget-summary',
            options: {
              month: startMonth,
              onBudgetAction,
            },
          },
        }),
      );
    }
  }, [budgetType, dispatch, onBudgetAction, startMonth]);

  const onOpenNewCategoryGroupModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'new-category-group',
          options: {
            onValidate: name => (!name ? 'Name is required.' : null),
            onSubmit: async name => {
              dispatch(collapseModals({ rootModalName: 'budget-page-menu' }));
              dispatch(createGroup({ name }));
            },
          },
        },
      }),
    );
  }, [dispatch]);

  const onOpenNewCategoryModal = useCallback(
    (groupId, isIncome) => {
      dispatch(
        pushModal({
          modal: {
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

  const onApplyBudgetTemplatesInGroup = useCallback(
    async categories => {
      dispatch(
        applyBudgetAction({
          month: startMonth,
          type: 'apply-multiple-templates',
          args: {
            categories,
          },
        }),
      );
    },
    [dispatch, startMonth],
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
            modal: {
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
            },
          }),
        );
      } else {
        dispatch(collapseModals({ rootModalName: 'category-group-menu' }));
        dispatch(deleteGroup({ id: groupId }));
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
            modal: {
              name: 'confirm-category-delete',
              options: {
                category: categoryId,
                onDelete: transferCategory => {
                  if (categoryId !== transferCategory) {
                    dispatch(
                      collapseModals({ rootModalName: 'category-menu' }),
                    );
                    dispatch(
                      deleteCategory({
                        id: categoryId,
                        transferId: transferCategory,
                      }),
                    );
                  }
                },
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

  const onCurrentMonth = useCallback(async () => {
    await prewarmMonth(budgetType, spreadsheet, currMonth);
    setStartMonthPref(currMonth);
    setInitialized(true);
  }, [budgetType, setStartMonthPref, spreadsheet, currMonth]);

  // const onOpenMonthActionMenu = () => {
  //   const options = [
  //     'Copy last month’s budget',
  //     'Set budgets to zero',
  //     'Set budgets to 3 month average',
  //     budgetType === 'tracking' && 'Apply to all future budgets',
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
  //           if (budgetType === 'tracking') {
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
          modal: {
            name: 'notes',
            options: {
              id,
              name: group.name,
              onSave: onSaveNotes,
            },
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
          modal: {
            name: 'notes',
            options: {
              id,
              name: category.name,
              onSave: onSaveNotes,
            },
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
          modal: {
            name: 'category-group-menu',
            options: {
              groupId: group.id,
              onSave: onSaveGroup,
              onAddCategory: onOpenNewCategoryModal,
              onEditNotes: onOpenCategoryGroupNotesModal,
              onDelete: onDeleteGroup,
              onToggleVisibility: onToggleGroupVisibility,
              onApplyBudgetTemplatesInGroup,
            },
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
      onApplyBudgetTemplatesInGroup,
    ],
  );

  const onOpenCategoryMenuModal = useCallback(
    id => {
      const category = categories.find(c => c.id === id);
      dispatch(
        pushModal({
          modal: {
            name: 'category-menu',
            options: {
              categoryId: category.id,
              onSave: onSaveCategory,
              onEditNotes: onOpenCategoryNotesModal,
              onDelete: onDeleteCategory,
              onToggleVisibility: onToggleCategoryVisibility,
            },
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
          modal: {
            name: 'notes',
            options: {
              id: `budget-${month}`,
              name: monthUtils.format(month, 'MMMM ‘yy', locale),
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [dispatch, onSaveNotes, locale],
  );

  const onSwitchBudgetFile = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'budget-file-selection' } }));
  }, [dispatch]);

  const onOpenBudgetMonthMenu = useCallback(
    month => {
      dispatch(
        pushModal({
          modal: {
            name: `${budgetType}-budget-month-menu`,
            options: {
              month,
              onBudgetAction,
              onEditNotes: onOpenBudgetMonthNotesModal,
            },
          },
        }),
      );
    },
    [budgetType, dispatch, onBudgetAction, onOpenBudgetMonthNotesModal],
  );

  const onOpenBudgetPageMenu = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'budget-page-menu',
          options: {
            onAddCategoryGroup: onOpenNewCategoryGroupModal,
            onToggleHiddenCategories,
            onSwitchBudgetFile,
          },
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
    <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
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
            month={startMonth}
            monthBounds={bounds}
            onShowBudgetSummary={onShowBudgetSummary}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onCurrentMonth={onCurrentMonth}
            onBudgetAction={onBudgetAction}
            onRefresh={onRefresh}
            onEditCategoryGroup={onOpenCategoryGroupMenuModal}
            onEditCategory={onOpenCategoryMenuModal}
            onOpenBudgetPageMenu={onOpenBudgetPageMenu}
            onOpenBudgetMonthMenu={onOpenBudgetMonthMenu}
          />
        )}
      </SyncRefresh>
    </SheetNameProvider>
  );
}
