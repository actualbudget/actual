// @ts-strict-ignore
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GridList, GridListItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Card } from '@actual-app/components/card';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgLogo } from '@actual-app/components/icons/logo';
import {
  SvgArrowThinLeft,
  SvgArrowThinRight,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowButtonDown1,
  SvgCalendar,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { groupById } from 'loot-core/shared/util';

import { BudgetTable, PILL_STYLE } from './BudgetTable';

import { sync } from '@desktop-client/app/appSlice';
import {
  applyBudgetAction,
  createCategory,
  createCategoryGroup,
  deleteCategory,
  deleteCategoryGroup,
  updateCategory,
  updateCategoryGroup,
} from '@desktop-client/budget/budgetSlice';
import { prewarmMonth } from '@desktop-client/components/budget/util';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { SyncRefresh } from '@desktop-client/components/SyncRefresh';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useOverspentCategories } from '@desktop-client/hooks/useOverspentCategories';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { collapseModals, pushModal } from '@desktop-client/modals/modalsSlice';
import { uncategorizedTransactions } from '@desktop-client/queries';
import { useDispatch } from '@desktop-client/redux';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

function isBudgetType(input?: string): input is 'envelope' | 'tracking' {
  return ['envelope', 'tracking'].includes(input);
}

export function BudgetPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { list: categories, grouped: categoryGroups } = useCategories();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = isBudgetType(budgetTypePref) ? budgetTypePref : 'envelope';
  const spreadsheet = useSpreadsheet();

  const currMonth = monthUtils.currentMonth();
  const [startMonth = currMonth, setStartMonthPref] =
    useLocalPref('budget.startMonth');
  const [monthBounds, setMonthBounds] = useState({
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
      setMonthBounds({ start, end });

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
              dispatch(createCategoryGroup({ name }));
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
      dispatch(updateCategoryGroup({ group }));
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
                    deleteCategoryGroup({
                      id: groupId,
                      transferId: transferCategory,
                    }),
                  );
                },
              },
            },
          }),
        );
      } else {
        dispatch(collapseModals({ rootModalName: 'category-group-menu' }));
        dispatch(deleteCategoryGroup({ id: groupId }));
      }
    },
    [categoryGroups, dispatch],
  );

  const onToggleGroupVisibility = useCallback(
    groupId => {
      const group = categoryGroups.find(g => g.id === groupId);
      onSaveGroup({
        ...group,
        hidden: group.hidden ? false : true,
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
        hidden: category.hidden ? false : true,
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
    <Page
      padding={0}
      header={
        <MobilePageHeader
          title={
            <MonthSelector
              month={startMonth}
              monthBounds={monthBounds}
              onOpenMonthMenu={onOpenBudgetMonthMenu}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
            />
          }
          leftContent={
            <Button
              variant="bare"
              style={{ margin: 10 }}
              onPress={onOpenBudgetPageMenu}
              aria-label={t('Budget page menu')}
            >
              <SvgLogo
                style={{ color: theme.mobileHeaderText }}
                width="20"
                height="20"
              />
              <SvgCheveronRight
                style={{ flexShrink: 0, color: theme.mobileHeaderTextSubdued }}
                width="14"
                height="14"
              />
            </Button>
          }
          rightContent={
            !monthUtils.isCurrentMonth(startMonth) && (
              <Button
                variant="bare"
                onPress={onCurrentMonth}
                aria-label={t('Today')}
                style={{ margin: 10 }}
              >
                <SvgCalendar width={20} height={20} />
              </Button>
            )
          }
        />
      }
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
        <SyncRefresh
          onSync={async () => {
            dispatch(sync());
          }}
        >
          {({ onRefresh }) => (
            <>
              <Banners month={startMonth} onBudgetAction={onBudgetAction} />
              <BudgetTable
                // This key forces the whole table rerender when the number
                // format changes
                key={`${numberFormat}${hideFraction}`}
                categoryGroups={categoryGroups}
                month={startMonth}
                onShowBudgetSummary={onShowBudgetSummary}
                onBudgetAction={onBudgetAction}
                onRefresh={onRefresh}
                onEditCategoryGroup={onOpenCategoryGroupMenuModal}
                onEditCategory={onOpenCategoryMenuModal}
              />
            </>
          )}
        </SyncRefresh>
      </SheetNameProvider>
    </Page>
  );
}

function Banners({ month, onBudgetAction }) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  return (
    <GridList
      aria-label={t('Banners')}
      style={{ backgroundColor: theme.mobilePageBackground }}
    >
      <UncategorizedTransactionsBanner />
      <OverspendingBanner
        month={month}
        onBudgetAction={onBudgetAction}
        budgetType={budgetType}
      />
      {budgetType === 'envelope' && (
        <OverbudgetedBanner month={month} onBudgetAction={onBudgetAction} />
      )}
    </GridList>
  );
}

function Banner({ type = 'info', children }) {
  return (
    <Card
      style={{
        height: 50,
        marginTop: 10,
        marginBottom: 10,
        padding: 10,
        justifyContent: 'center',
        backgroundColor:
          type === 'critical'
            ? theme.errorBackground
            : type === 'warning'
              ? theme.warningBackground
              : theme.noticeBackground,
      }}
    >
      {children}
    </Card>
  );
}

function UncategorizedTransactionsBanner(props) {
  const navigate = useNavigate();
  const format = useFormat();

  const transactionsQuery = useMemo(
    () => uncategorizedTransactions().select('*'),
    [],
  );

  const { transactions, isLoading } = useTransactions({
    query: transactionsQuery,
    options: {
      pageCount: 1000,
    },
  });

  if (isLoading || transactions.length === 0) {
    return null;
  }

  const totalUncategorizedAmount = transactions.reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0,
  );

  return (
    <GridListItem textValue="Uncategorized transactions banner" {...props}>
      <Banner type="warning">
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Trans count={transactions.length}>
            You have {{ count: transactions.length }} uncategorized transactions
            ({{ amount: format(totalUncategorizedAmount, 'financial') }})
          </Trans>
          <Button
            onPress={() => navigate('/categories/uncategorized')}
            style={PILL_STYLE}
          >
            <Text>
              <Trans>Categorize</Trans>
            </Text>
          </Button>
        </View>
      </Banner>
    </GridListItem>
  );
}

function OverbudgetedBanner({ month, onBudgetAction, ...props }) {
  const { t } = useTranslation();
  const format = useFormat();
  const toBudgetAmount = useSheetValue<
    'envelope-budget',
    typeof envelopeBudget.toBudget
  >(envelopeBudget.toBudget);
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = useMemo(() => groupById(categories), [categories]);

  const openCoverOverbudgetedModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: t('Cover overbudgeted'),
            month,
            amount: toBudgetAmount,
            showToBeBudgeted: false,
            onSubmit: (amount, categoryId) => {
              onBudgetAction(month, 'cover-overbudgeted', {
                category: categoryId,
                amount,
                currencyCode: format.currency.code,
              });
              showUndoNotification({
                message: t('Covered overbudgeted from {{categoryName}}', {
                  categoryName: categoriesById[categoryId].name,
                }),
              });
            },
          },
        },
      }),
    );
  }, [
    categoriesById,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
    t,
    toBudgetAmount,
    format.currency.code,
  ]);

  if (!toBudgetAmount || toBudgetAmount >= 0) {
    return null;
  }

  return (
    <GridListItem textValue="Overbudgeted banner" {...props}>
      <Banner type="critical">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <SvgArrowButtonDown1 style={{ width: 15, height: 15 }} />
              <Text>
                <Trans>You have budgeted more than your available funds</Trans>
              </Text>
            </View>
          </View>
          <Button onPress={openCoverOverbudgetedModal} style={PILL_STYLE}>
            <Trans>Cover</Trans>
          </Button>
        </View>
      </Banner>
    </GridListItem>
  );
}

function OverspendingBanner({ month, onBudgetAction, budgetType, ...props }) {
  const { t } = useTranslation();

  const { list: categories, grouped: categoryGroups } = useCategories();
  const categoriesById = useMemo(() => groupById(categories), [categories]);

  const dispatch = useDispatch();
  const format = useFormat();

  const {
    categories: overspentCategories,
    amountsByCategory,
    totalAmount: totalOverspending,
  } = useOverspentCategories({ month });

  const categoryGroupsToShow = useMemo(
    () =>
      categoryGroups
        .filter(g => overspentCategories.some(c => c.group === g.id))
        .map(g => ({
          ...g,
          categories: overspentCategories.filter(c => c.group === g.id),
        })),
    [categoryGroups, overspentCategories],
  );

  const { showUndoNotification } = useUndo();

  const onOpenCoverCategoryModal = useCallback(
    categoryId => {
      const category = categoriesById[categoryId];
      dispatch(
        pushModal({
          modal: {
            name: 'cover',
            options: {
              title: category.name,
              month,
              amount: amountsByCategory.get(category.id),
              categoryId: category.id,
              onSubmit: (amount, fromCategoryId) => {
                onBudgetAction(month, 'cover-overspending', {
                  to: category.id,
                  from: fromCategoryId,
                  amount,
                  currencyCode: format.currency.code,
                });
                showUndoNotification({
                  message: t(
                    `Covered {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                    {
                      toCategoryName: category.name,
                      fromCategoryName:
                        fromCategoryId === 'to-budget'
                          ? t('To Budget')
                          : categoriesById[fromCategoryId].name,
                    },
                  ),
                });
              },
            },
          },
        }),
      );
    },
    [
      amountsByCategory,
      categoriesById,
      dispatch,
      month,
      onBudgetAction,
      showUndoNotification,
      t,
      format.currency.code,
    ],
  );

  const onOpenCategorySelectionModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            title:
              budgetType === 'envelope'
                ? t('Cover overspending')
                : t('Overspent categories'),
            month,
            categoryGroups: categoryGroupsToShow,
            showHiddenCategories: true,
            onSelect:
              budgetType === 'envelope' ? onOpenCoverCategoryModal : null,
            clearOnSelect: true,
            closeOnSelect: false,
          },
        },
      }),
    );
  }, [
    categoryGroupsToShow,
    dispatch,
    month,
    onOpenCoverCategoryModal,
    t,
    budgetType,
  ]);

  const numberOfOverspentCategories = overspentCategories.length;
  if (numberOfOverspentCategories === 0) {
    return null;
  }

  return (
    <GridListItem textValue="Overspent banner" {...props}>
      <Banner type="critical">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text>
              <Trans count={numberOfOverspentCategories}>
                You have {{ count: numberOfOverspentCategories }} overspent
                categories ({{ amount: format(totalOverspending, 'financial') }}
                )
              </Trans>
            </Text>
          </View>
          <Button onPress={onOpenCategorySelectionModal} style={PILL_STYLE}>
            {budgetType === 'envelope' && <Trans>Cover</Trans>}
            {budgetType === 'tracking' && <Trans>View</Trans>}
          </Button>
        </View>
      </Banner>
    </GridListItem>
  );
}

function MonthSelector({
  month,
  monthBounds,
  onOpenMonthMenu,
  onPrevMonth,
  onNextMonth,
}) {
  const locale = useLocale();
  const { t } = useTranslation();
  const prevEnabled = month > monthBounds.start;
  const nextEnabled = month < monthUtils.subMonths(monthBounds.end, 1);

  const arrowButtonStyle = {
    padding: 10,
    margin: 2,
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      <Button
        aria-label={t('Previous month')}
        variant="bare"
        isDisabled={!prevEnabled}
        onPress={onPrevMonth}
        style={{ ...arrowButtonStyle, opacity: prevEnabled ? 1 : 0.6 }}
      >
        <SvgArrowThinLeft width="15" height="15" />
      </Button>
      <Button
        variant="bare"
        style={{
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
        }}
        onPress={() => {
          onOpenMonthMenu?.(month);
        }}
        data-month={month}
      >
        <Text style={styles.underlinedText}>
          {monthUtils.format(month, 'MMMM ‘yy', locale)}
        </Text>
      </Button>
      <Button
        aria-label={t('Next month')}
        variant="bare"
        isDisabled={!nextEnabled}
        onPress={onNextMonth}
        style={{ ...arrowButtonStyle, opacity: nextEnabled ? 1 : 0.6 }}
      >
        <SvgArrowThinRight width="15" height="15" />
      </Button>
    </View>
  );
}
