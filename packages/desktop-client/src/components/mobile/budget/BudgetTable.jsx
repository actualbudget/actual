import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { GridList, GridListItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Card } from '@actual-app/components/card';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgLogo } from '@actual-app/components/icons/logo';
import {
  SvgArrowThinLeft,
  SvgArrowThinRight,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowButtonDown1,
  SvgCalendar,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';
import memoizeOne from 'memoize-one';

import { collapseModals, pushModal } from 'loot-core/client/modals/modalsSlice';
import {
  envelopeBudget,
  trackingBudget,
  uncategorizedCount,
} from 'loot-core/client/queries';
import { useSpreadsheet } from 'loot-core/client/SpreadsheetProvider';
import * as monthUtils from 'loot-core/shared/months';
import { groupById } from 'loot-core/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { useLocale } from '../../../hooks/useLocale';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePrevious } from '../../../hooks/usePrevious';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useUndo } from '../../../hooks/useUndo';
import { useDispatch } from '../../../redux';
import { MobilePageHeader, Page } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { CellValue } from '../../spreadsheet/CellValue';
import { NamespaceContext } from '../../spreadsheet/NamespaceContext';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

import { ExpenseGroupList } from './ExpenseGroupList';
import { IncomeGroup } from './IncomeGroup';

export const ROW_HEIGHT = 50;

export const PILL_STYLE = {
  borderRadius: 16,
  color: theme.pillText,
  backgroundColor: theme.pillBackgroundLight,
};

export function getColumnWidth({
  show3Columns = false,
  isSidebar = false,
  offset = 0,
} = {}) {
  // If show3Columns = 35vw | 20vw | 20vw | 20vw,
  // Else = 45vw | 25vw | 25vw,
  if (!isSidebar) {
    return show3Columns ? `${20 + offset}vw` : `${25 + offset}vw`;
  }
  return show3Columns ? `${35 + offset}vw` : `${45 + offset}vw`;
}

function ToBudget({ toBudget, onPress, show3Columns }) {
  const { t } = useTranslation();
  const amount = useSheetValue(toBudget);
  const format = useFormat();
  const sidebarColumnWidth = getColumnWidth({ show3Columns, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View>
          <Label
            title={amount < 0 ? t('Overbudgeted') : t('To Budget')}
            style={{
              ...(amount < 0 ? styles.smallText : {}),
              color: theme.formInputText,
              flexShrink: 0,
              textAlign: 'left',
            }}
          />
          <CellValue binding={toBudget} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color:
                        amount < 0
                          ? theme.errorText
                          : amount > 0
                            ? theme.noticeText
                            : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

function Saved({ projected, onPress, show3Columns }) {
  const { t } = useTranslation();
  const binding = projected
    ? trackingBudget.totalBudgetedSaved
    : trackingBudget.totalSaved;

  const saved = useSheetValue(binding) || 0;
  const format = useFormat();
  const isNegative = saved < 0;
  const sidebarColumnWidth = getColumnWidth({ show3Columns, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View style={{ alignItems: 'flex-start' }}>
          {projected ? (
            <View>
              <AutoTextSize
                as={Label}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                title="Projected savings"
                style={{
                  color: theme.formInputText,
                  textAlign: 'left',
                  fontSize: 12,
                }}
              />
            </View>
          ) : (
            <Label
              title={isNegative ? t('Overspent') : t('Saved')}
              style={{
                color: theme.formInputText,
                textAlign: 'left',
              }}
            />
          )}

          <CellValue binding={binding} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: '700',
                      color: projected
                        ? theme.warningText
                        : isNegative
                          ? theme.errorTextDark
                          : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

function BudgetGroups({
  categoryGroups,
  onEditGroup,
  onEditCategory,
  month,
  onBudgetAction,
  showBudgetedColumn,
  show3Columns,
  showHiddenCategories,
}) {
  const separateGroups = memoizeOne(groups => {
    return {
      incomeGroup: groups.find(group => group.is_income),
      expenseGroups: groups.filter(group => !group.is_income),
    };
  });

  const { incomeGroup, expenseGroups } = separateGroups(categoryGroups);
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');

  const onToggleCollapse = useCallback(
    id => {
      setCollapsedGroupIdsPref(
        collapsedGroupIds.includes(id)
          ? collapsedGroupIds.filter(collapsedId => collapsedId !== id)
          : [...collapsedGroupIds, id],
      );
    },
    [collapsedGroupIds, setCollapsedGroupIdsPref],
  );

  const isCollapsed = useCallback(
    id => {
      return collapsedGroupIds.includes(id);
    },
    [collapsedGroupIds],
  );

  return (
    <View
      data-testid="budget-groups"
      style={{ flex: '1 0 auto', overflowY: 'auto', paddingBottom: 15 }}
    >
      <ExpenseGroupList
        groups={expenseGroups}
        showBudgetedColumn={showBudgetedColumn}
        month={month}
        onEditGroup={onEditGroup}
        onEditCategory={onEditCategory}
        onBudgetAction={onBudgetAction}
        show3Columns={show3Columns}
        showHiddenCategories={showHiddenCategories}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {incomeGroup && (
        <IncomeGroup
          group={incomeGroup}
          month={month}
          showHiddenCategories={showHiddenCategories}
          onEditGroup={onEditGroup}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      )}
    </View>
  );
}

export function BudgetTable({
  categoryGroups,
  month,
  monthBounds,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  onShowBudgetSummary,
  onBudgetAction,
  onRefresh,
  onEditGroup,
  onEditCategory,
  onOpenBudgetPageMenu,
  onOpenBudgetMonthMenu,
}) {
  const { t } = useTranslation();
  const { width } = useResponsive();
  const show3Columns = width >= 360;

  // let editMode = false; // neuter editMode -- sorry, not rewriting drag-n-drop right now

  const [showSpentColumn = false, setShowSpentColumnPref] = useLocalPref(
    'mobile.showSpentColumn',
  );

  function toggleSpentColumn() {
    setShowSpentColumnPref(!showSpentColumn);
  }

  const [showHiddenCategories = false] = useLocalPref(
    'budget.showHiddenCategories',
  );

  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  return (
    <Page
      padding={0}
      header={
        <MobilePageHeader
          title={
            <MonthSelector
              month={month}
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
            <Button
              variant="bare"
              onPress={onCurrentMonth}
              aria-label={t('Today')}
              style={{ margin: 10 }}
            >
              {!monthUtils.isCurrentMonth(month) && (
                <SvgCalendar width={20} height={20} />
              )}
            </Button>
          }
        />
      }
    >
      <Banners month={month} onBudgetAction={onBudgetAction} />
      <BudgetTableHeader
        month={month}
        show3Columns={show3Columns}
        showSpentColumn={showSpentColumn}
        toggleSpentColumn={toggleSpentColumn}
        onShowBudgetSummary={onShowBudgetSummary}
      />
      <PullToRefresh onRefresh={onRefresh}>
        <View
          data-testid="budget-table"
          style={{
            backgroundColor: theme.pageBackground,
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          <BudgetGroups
            type={budgetType}
            categoryGroups={categoryGroups}
            showBudgetedColumn={!showSpentColumn}
            show3Columns={show3Columns}
            showHiddenCategories={showHiddenCategories}
            month={month}
            onEditGroup={onEditGroup}
            onEditCategory={onEditCategory}
            onBudgetAction={onBudgetAction}
          />
        </View>
      </PullToRefresh>
    </Page>
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
  const count = useSheetValue(uncategorizedCount());
  const navigate = useNavigate();

  if (count === null || count <= 0) {
    return null;
  }

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
          <Trans count={count}>
            You have {{ count }} uncategorized transactions
          </Trans>
          <Button
            onPress={() => navigate('/accounts/uncategorized')}
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
  const toBudgetAmount = useSheetValue(envelopeBudget.toBudget);
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

  const openCoverOverbudgetedModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: t('Cover overbudgeted'),
            month,
            showToBeBudgeted: false,
            onSubmit: categoryId => {
              onBudgetAction(month, 'cover-overbudgeted', {
                category: categoryId,
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

function OverspendingBanner({ month, onBudgetAction, ...props }) {
  const { t } = useTranslation();

  const { list: categories, grouped: categoryGroups } = useCategories();
  const categoriesById = groupById(categories);

  const categoryBalanceBindings = useMemo(
    () =>
      categories.map(category => [
        category.id,
        envelopeBudget.catBalance(category.id),
      ]),
    [categories],
  );

  const categoryCarryoverBindings = useMemo(
    () =>
      categories.map(category => [
        category.id,
        envelopeBudget.catCarryover(category.id),
      ]),
    [categories],
  );

  const [overspentByCategory, setOverspentByCategory] = useState({});
  const [carryoverFlagByCategory, setCarryoverFlagByCategory] = useState({});
  const sheetName = useContext(NamespaceContext);
  const spreadsheet = useSpreadsheet();

  useEffect(() => {
    const unbindList = [];
    for (const [categoryId, carryoverBinding] of categoryCarryoverBindings) {
      const unbind = spreadsheet.bind(sheetName, carryoverBinding, result => {
        const isRolloverEnabled = Boolean(result.value);
        if (isRolloverEnabled) {
          setCarryoverFlagByCategory(prev => ({
            ...prev,
            [categoryId]: result.value,
          }));
        } else {
          // Update to remove covered category.
          setCarryoverFlagByCategory(prev => {
            const { [categoryId]: _, ...rest } = prev;
            return rest;
          });
        }
      });
      unbindList.push(unbind);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryCarryoverBindings, sheetName, spreadsheet]);

  useEffect(() => {
    const unbindList = [];
    for (const [categoryId, balanceBinding] of categoryBalanceBindings) {
      const unbind = spreadsheet.bind(sheetName, balanceBinding, result => {
        if (result.value < 0) {
          setOverspentByCategory(prev => ({
            ...prev,
            [categoryId]: result.value,
          }));
        } else if (result.value === 0) {
          // Update to remove covered category.
          setOverspentByCategory(prev => {
            const { [categoryId]: _, ...rest } = prev;
            return rest;
          });
        }
      });
      unbindList.push(unbind);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryBalanceBindings, sheetName, spreadsheet]);

  const dispatch = useDispatch();

  // Ignore those that has rollover enabled.
  const overspentCategoryIds = Object.keys(overspentByCategory).filter(
    id => !carryoverFlagByCategory[id],
  );

  const categoryGroupsToShow = useMemo(
    () =>
      categoryGroups
        .filter(g =>
          g.categories?.some(c => overspentCategoryIds.includes(c.id)),
        )
        .map(g => ({
          ...g,
          categories:
            g.categories?.filter(c => overspentCategoryIds.includes(c.id)) ||
            [],
        })),
    [categoryGroups, overspentCategoryIds],
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
              categoryId: category.id,
              onSubmit: fromCategoryId => {
                onBudgetAction(month, 'cover-overspending', {
                  to: category.id,
                  from: fromCategoryId,
                });
                showUndoNotification({
                  message: t(
                    `Covered {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                    {
                      toCategoryName: category.name,
                      fromCategoryName:
                        fromCategoryId === 'to-budget'
                          ? 'To Budget'
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
    [categoriesById, dispatch, month, onBudgetAction, showUndoNotification, t],
  );

  const onOpenCategorySelectionModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            title: t('Cover overspending'),
            month,
            categoryGroups: categoryGroupsToShow,
            onSelect: onOpenCoverCategoryModal,
            clearOnSelect: true,
            closeOnSelect: false,
          },
        },
      }),
    );
  }, [categoryGroupsToShow, dispatch, month, onOpenCoverCategoryModal, t]);

  const numberOfOverspentCategories = overspentCategoryIds.length;
  const previousNumberOfOverspentCategories = usePrevious(
    numberOfOverspentCategories,
  );

  useEffect(() => {
    if (numberOfOverspentCategories < previousNumberOfOverspentCategories) {
      // Re-render the modal when the overspent categories are covered.
      dispatch(collapseModals({ rootModalName: 'category-autocomplete' }));
      onOpenCategorySelectionModal();

      // All overspent categories have been covered.
      if (numberOfOverspentCategories === 0) {
        dispatch(collapseModals({ rootModalName: 'category-autocomplete' }));
      }
    }
  }, [
    dispatch,
    onOpenCategorySelectionModal,
    numberOfOverspentCategories,
    previousNumberOfOverspentCategories,
  ]);

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
                categories
              </Trans>
            </Text>
          </View>
          <Button onPress={onOpenCategorySelectionModal} style={PILL_STYLE}>
            <Trans>Cover</Trans>
          </Button>
        </View>
      </Banner>
    </GridListItem>
  );
}

function Banners({ month, onBudgetAction }) {
  const { t } = useTranslation();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  // Limit to rollover for now.
  if (budgetType !== 'rollover') {
    return null;
  }

  return (
    <GridList
      aria-label={t('Banners')}
      style={{ backgroundColor: theme.mobilePageBackground }}
    >
      <UncategorizedTransactionsBanner />
      <OverspendingBanner month={month} onBudgetAction={onBudgetAction} />
      <OverbudgetedBanner month={month} onBudgetAction={onBudgetAction} />
    </GridList>
  );
}

function BudgetTableHeader({
  show3Columns,
  month,
  onShowBudgetSummary,
  showSpentColumn,
  toggleSpentColumn,
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const buttonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 'unset',
  };
  const sidebarColumnWidth = getColumnWidth({ show3Columns, isSidebar: true });
  const columnWidth = getColumnWidth({ show3Columns });

  const amountStyle = {
    color: theme.formInputText,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '500',
  };

  return (
    <View
      data-testid="budget-table-header"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        padding: '10px 15px',
        paddingLeft: 10,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: sidebarColumnWidth,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {budgetType === 'report' ? (
          <Saved
            projected={month >= monthUtils.currentMonth()}
            onPress={onShowBudgetSummary}
            show3Columns={show3Columns}
          />
        ) : (
          <ToBudget
            toBudget={envelopeBudget.toBudget}
            onPress={onShowBudgetSummary}
            show3Columns={show3Columns}
          />
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {(show3Columns || !showSpentColumn) && (
          <CellValue
            binding={
              budgetType === 'report'
                ? trackingBudget.totalBudgetedExpense
                : envelopeBudget.totalBudgeted
            }
            type="financial"
          >
            {({ type: formatType, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Columns}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Columns && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <Label
                      title={t('Budgeted')}
                      style={{ color: theme.formInputText, paddingRight: 4 }}
                    />
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(
                          budgetType === 'report' ? value : -value,
                          formatType,
                        )}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        {(show3Columns || showSpentColumn) && (
          <CellValue
            binding={
              budgetType === 'report'
                ? trackingBudget.totalSpent
                : envelopeBudget.totalSpent
            }
            type="financial"
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Columns}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Columns && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <Label
                      title={t('Spent')}
                      style={{ color: theme.formInputText, paddingRight: 4 }}
                    />
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(value, type)}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        <CellValue
          binding={
            budgetType === 'report'
              ? trackingBudget.totalLeftover
              : envelopeBudget.totalBalance
          }
          type="financial"
        >
          {({ type, value }) => (
            <View style={{ width: columnWidth }}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Label
                  title={t('Balance')}
                  style={{ color: theme.formInputText }}
                />
                <View>
                  <PrivacyFilter>
                    <AutoTextSize
                      key={value}
                      as={Text}
                      minFontSizePx={6}
                      maxFontSizePx={12}
                      mode="oneline"
                      style={{
                        ...amountStyle,
                      }}
                    >
                      {format(value, type)}
                    </AutoTextSize>
                  </PrivacyFilter>
                </View>
              </View>
            </View>
          )}
        </CellValue>
      </View>
    </View>
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
        onPress={() => {
          if (prevEnabled) {
            onPrevMonth();
          }
        }}
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
        onPress={() => {
          if (nextEnabled) {
            onNextMonth();
          }
        }}
        style={{ ...arrowButtonStyle, opacity: nextEnabled ? 1 : 0.6 }}
      >
        <SvgArrowThinRight width="15" height="15" />
      </Button>
    </View>
  );
}
