// @ts-strict-ignore
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GridList, GridListItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
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
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { groupById } from '@actual-app/core/shared/util';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { sync } from '#app/appSlice';
import { useBudgetActions, useCreateCategoryGroupMutation } from '#budget';
import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { prewarmMonth } from '#components/budget/util';
import { FinancialText } from '#components/FinancialText';
import { MobilePageHeader, Page } from '#components/Page';
import { SyncRefresh } from '#components/SyncRefresh';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { useOverspentCategories } from '#hooks/useOverspentCategories';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useTransactions } from '#hooks/useTransactions';
import { useUndo } from '#hooks/useUndo';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import { uncategorizedTransactions } from '#queries';
import { useDispatch } from '#redux';
import { envelopeBudget } from '#spreadsheet/bindings';

import { BudgetTable } from './BudgetTable';
import { ReorderModeContext } from './ReorderModeContext';

const PILL_STYLE = {
  borderRadius: 16,
  color: theme.pillText,
  backgroundColor: theme.pillBackgroundLight,
};

function isBudgetType(input?: string): input is 'envelope' | 'tracking' {
  return ['envelope', 'tracking'].includes(input);
}

export function BudgetPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const {
    data: { grouped: categoryGroups } = {
      list: [],
      grouped: [],
    },
  } = useCategories();
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
  const [initialized, setInitialized] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const applyBudgetAction = useBudgetActions();
  const createCategoryGroup = useCreateCategoryGroupMutation();

  useEffect(() => {
    async function init() {
      const { start, end } = await send('get-budget-bounds');
      setMonthBounds({ start, end });

      await prewarmMonth(budgetType, spreadsheet, startMonth);

      setInitialized(true);
    }

    void init();
  }, [budgetType, startMonth, dispatch, spreadsheet]);

  const onBudgetAction = useCallback(
    async (month, type, args?) => {
      applyBudgetAction.mutate({ month, type, args });
    },
    [applyBudgetAction],
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
            onValidate: name => (!name ? t('Name is required.') : null),
            onSubmit: async name => {
              createCategoryGroup.mutate(
                { name },
                {
                  onSettled: () => {
                    dispatch(
                      collapseModals({ rootModalName: 'budget-page-menu' }),
                    );
                  },
                },
              );
            },
          },
        },
      }),
    );
  }, [dispatch, createCategoryGroup, t]);

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

  const onSaveNotes = useCallback(async (id, notes) => {
    await send('notes-save', { id, note: notes });
  }, []);

  const [showHiddenCategories, setShowHiddenCategoriesPref] = useLocalPref(
    'budget.showHiddenCategories',
  );

  const onToggleHiddenCategories = useCallback(() => {
    setShowHiddenCategoriesPref(!showHiddenCategories);
  }, [setShowHiddenCategoriesPref, showHiddenCategories]);

  const onOpenBudgetMonthNotesModal = useCallback(
    (month: string) => {
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id: `budget-${month}`,
              name: monthUtils.format(month, "MMMM ''yy", locale),
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [dispatch, onSaveNotes, locale],
  );

  const onSwitchBudgetFile = useCallback(() => {
    void dispatch(closeBudget());
  }, [dispatch]);

  const onShowCategoryGroup = useCallback(
    (groupId: CategoryGroupEntity['id']) => {
      dispatch(
        pushModal({
          modal: {
            name: 'category-group-actions',
            options: { groupId, month: startMonth },
          },
        }),
      );
    },
    [dispatch, startMonth],
  );

  const onShowCategory = useCallback(
    (categoryId: CategoryEntity['id']) => {
      void navigate(`/categories/${categoryId}?month=${startMonth}`);
    },
    [navigate, startMonth],
  );

  const onSelectMonth = useCallback(
    async (month: string) => {
      await prewarmMonth(budgetType, spreadsheet, month);
      setStartMonthPref(month);
      setInitialized(true);
    },
    [budgetType, setStartMonthPref, spreadsheet],
  );

  const onOpenMonthPicker = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'budget-month-picker',
          options: {
            month: startMonth,
            monthBounds,
            onSelectMonth,
            onBudgetAction,
            onEditNotes: onOpenBudgetMonthNotesModal,
          },
        },
      }),
    );
  }, [
    dispatch,
    monthBounds,
    onBudgetAction,
    onOpenBudgetMonthNotesModal,
    onSelectMonth,
    startMonth,
  ]);

  const onOpenBudgetPageMenu = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'budget-page-menu',
          options: {
            isReorderMode,
            onAddCategoryGroup: onOpenNewCategoryGroupModal,
            onToggleHiddenCategories,
            onToggleReorderMode: () => setIsReorderMode(mode => !mode),
            onSwitchBudgetFile,
          },
        },
      }),
    );
  }, [
    dispatch,
    isReorderMode,
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
              onOpenMonthMenu={onOpenMonthPicker}
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
            isReorderMode ? (
              <Button
                variant="bare"
                onPress={() => setIsReorderMode(false)}
                style={{
                  ...styles.mediumText,
                  fontWeight: 600,
                  margin: 10,
                  color: theme.mobileHeaderText,
                }}
              >
                <Trans>Done</Trans>
              </Button>
            ) : (
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
            )
          }
        />
      }
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
        <SyncRefresh
          onSync={async () => {
            void dispatch(sync());
          }}
        >
          {({ onRefresh }) => (
            <>
              <Banners month={startMonth} onBudgetAction={onBudgetAction} />
              <ReorderModeContext.Provider value={isReorderMode}>
                <BudgetTable
                  // This key forces the whole table rerender when the number
                  // format changes
                  key={`${numberFormat}${hideFraction}`}
                  categoryGroups={categoryGroups}
                  month={startMonth}
                  onShowBudgetSummary={onShowBudgetSummary}
                  onRefresh={onRefresh}
                  onShowCategoryGroup={onShowCategoryGroup}
                  onShowCategory={onShowCategory}
                />
              </ReorderModeContext.Provider>
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
    <View
      style={{
        minHeight: 50,
        padding: '10px 15px',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        backgroundColor:
          type === 'critical'
            ? theme.errorBackground
            : type === 'warning'
              ? theme.warningBackground
              : theme.noticeBackground,
      }}
    >
      {children}
    </View>
  );
}

function UncategorizedTransactionsBanner(props) {
  const navigate = useNavigate();
  const format = useFormat();

  const transactionsQuery = useMemo(
    () => uncategorizedTransactions().select('*'),
    [],
  );

  const { transactions, isPending: isTransactionsLoading } = useTransactions({
    query: transactionsQuery,
    options: {
      pageSize: 1000,
    },
  });

  if (isTransactionsLoading || transactions.length === 0) {
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
          <Text>
            <Trans count={transactions.length}>
              You have {{ count: transactions.length }} uncategorized
              transactions (
              <FinancialText>
                {
                  {
                    amount: format(totalUncategorizedAmount, 'financial'),
                  } as TransObjectLiteral
                }
              </FinancialText>
              )
            </Trans>
          </Text>
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
  const { data: { list: categories } = { list: [] } } = useCategories();
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
          <View>
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

  const {
    data: { list: categories, grouped: categoryGroups } = {
      list: [],
      grouped: [],
    },
  } = useCategories();
  const categoriesById = useMemo(() => groupById(categories), [categories]);

  const dispatch = useDispatch();
  const format = useFormat();

  const {
    categories: overspentCategories,
    amountsByCategory,
    totalAmount: totalOverspending,
  } = useOverspentCategories({ month });

  const amountsByCategoryRef = useRef(amountsByCategory);
  amountsByCategoryRef.current = amountsByCategory;

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
              amount: amountsByCategoryRef.current.get(category.id),
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
          <Text>
            <Trans count={numberOfOverspentCategories}>
              You have {{ count: numberOfOverspentCategories }} overspent
              categories (
              <FinancialText>
                {
                  {
                    amount: format(totalOverspending, 'financial'),
                  } as TransObjectLiteral
                }
              </FinancialText>
              )
            </Trans>
          </Text>
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
          {monthUtils.format(month, "MMMM ''yy", locale)}
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
