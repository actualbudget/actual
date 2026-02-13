import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgQuestion } from '@actual-app/components/icons/v1';
import { SvgViewHide, SvgViewShow } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type {
  CategoryEntity,
  CrossoverWidget,
  TimeFrame,
} from 'loot-core/types/models';

import { Link } from '@desktop-client/components/common/Link';
import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { FinancialText } from '@desktop-client/components/FinancialText';
import { Checkbox } from '@desktop-client/components/forms';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { AccountSelector } from '@desktop-client/components/reports/AccountSelector';
import { CategorySelector } from '@desktop-client/components/reports/CategorySelector';
import { CrossoverGraph } from '@desktop-client/components/reports/graphs/CrossoverGraph';
import { Header } from '@desktop-client/components/reports/Header';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createCrossoverSpreadsheet } from '@desktop-client/components/reports/spreadsheets/crossover-spreadsheet';
import type { CrossoverData } from '@desktop-client/components/reports/spreadsheets/crossover-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import type { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export const defaultTimeFrame = {
  start: monthUtils.subMonths(monthUtils.currentMonth(), 120),
  end: monthUtils.subMonths(monthUtils.currentMonth(), 1),
  mode: 'full',
} satisfies TimeFrame;

export function Crossover() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<CrossoverWidget>(
    params.id ?? '',
    'crossover-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <CrossoverInner widget={widget} />;
}

type CrossoverInnerProps = { widget?: CrossoverWidget };

function CrossoverInner({ widget }: CrossoverInnerProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const accounts = useAccounts();
  const {
    data: categories = { grouped: [], list: [] },
    isPending: isCategoriesLoading,
  } = useCategories();
  const format = useFormat();

  const expenseCategoryGroups = categories.grouped.filter(
    group => !group.is_income,
  );
  const expenseCategories = categories.list.filter(c => !c.is_income);

  const [allMonths, setAllMonths] = useState<Array<{
    name: string;
    pretty: string;
  }> | null>(null);

  // Date range state
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [mode, setMode] = useState<TimeFrame['mode']>('static');
  const [earliestTransaction, setEarliestTransaction] = useState<string>('');
  const [latestTransaction, setLatestTransaction] = useState<string>('');

  const [selectedExpenseCategories, setSelectedExpenseCategories] =
    useState<Array<CategoryEntity>>(expenseCategories);
  const [selectedIncomeAccountIds, setSelectedIncomeAccountIds] = useState<
    string[]
  >(accounts.map(a => a.id));

  const [swr, setSwr] = useState(0.04);
  const [useCustomGrowth, setUseCustomGrowth] = useState(false);
  const [estimatedReturn, setEstimatedReturn] = useState<number | null>(null);
  const [expectedContribution, setExpectedContribution] = useState<
    number | null
  >(null);
  const [projectionType, setProjectionType] = useState<
    'hampel' | 'median' | 'mean'
  >('hampel');
  const [expenseAdjustmentFactor, setExpenseAdjustmentFactor] = useState(1.0);
  const [showHiddenCategories, setShowHiddenCategories] = useState(false);
  const [selectionsInitialized, setSelectionsInitialized] = useState(false);

  // reset when widget changes
  useEffect(() => {
    setSelectionsInitialized(false);
  }, [widget?.id]);

  // initialize once when data is available
  useEffect(() => {
    if (selectionsInitialized || accounts.length === 0 || isCategoriesLoading) {
      return;
    }

    const initialExpenseCategories = widget?.meta?.expenseCategoryIds?.length
      ? categories.list.filter(c =>
          widget.meta!.expenseCategoryIds!.includes(c.id),
        )
      : categories.list.filter(c => !c.is_income);

    const initialIncomeAccountIds = widget?.meta?.incomeAccountIds?.length
      ? widget.meta!.incomeAccountIds!
      : accounts.map(a => a.id);

    setSelectedExpenseCategories(initialExpenseCategories);
    setSelectedIncomeAccountIds(initialIncomeAccountIds);
    setSwr(widget?.meta?.safeWithdrawalRate ?? 0.04);

    const initialEstimatedReturn = widget?.meta?.estimatedReturn ?? null;
    const initialExpectedContribution =
      widget?.meta?.expectedContribution ?? null;
    const hasCustomGrowth =
      initialEstimatedReturn != null || initialExpectedContribution != null;

    setUseCustomGrowth(hasCustomGrowth);
    setEstimatedReturn(initialEstimatedReturn);
    setExpectedContribution(initialExpectedContribution);
    setProjectionType(widget?.meta?.projectionType ?? 'hampel');
    setExpenseAdjustmentFactor(widget?.meta?.expenseAdjustmentFactor ?? 1.0);
    setShowHiddenCategories(widget?.meta?.showHiddenCategories ?? false);

    setSelectionsInitialized(true);
  }, [
    selectionsInitialized,
    accounts,
    categories.list,
    isCategoriesLoading,
    widget?.meta,
  ]);

  useEffect(() => {
    async function run() {
      const earliestTransactionData = await send('get-earliest-transaction');

      const currentMonth = monthUtils.currentMonth();
      const previousMonth = monthUtils.subMonths(currentMonth, 1);

      // Set earliest transaction date
      const earliestDate = earliestTransactionData
        ? earliestTransactionData.date
        : monthUtils.firstDayOfMonth(previousMonth);
      setEarliestTransaction(earliestDate);

      // Set latest transaction date, ensuring it doesn't include current month
      const latestDate = monthUtils.lastDayOfMonth(previousMonth);
      setLatestTransaction(latestDate);

      const allMonths = monthUtils
        .rangeInclusive(earliestDate, latestDate)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM yyyy', locale),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    run();
  }, [locale]);

  useEffect(() => {
    if (latestTransaction && allMonths?.length) {
      const [initialStart, initialEnd, mode] = calculateTimeRange(
        widget?.meta?.timeFrame,
        defaultTimeFrame,
        latestTransaction,
      );
      const earliestMonth = allMonths[allMonths.length - 1].name;
      const latestMonth = allMonths[0].name;
      let start = initialStart;
      let end = initialEnd;

      const clampMonth = (m: string) => {
        if (monthUtils.isBefore(m, earliestMonth)) return earliestMonth;
        if (monthUtils.isAfter(m, latestMonth)) return latestMonth;
        return m;
      };

      // For both sliding-window and full modes, ensure end doesn't include current month
      if (mode === 'sliding-window') {
        // Shift both start and end back one month for sliding-window
        start = clampMonth(monthUtils.subMonths(start, 1));
        end = clampMonth(monthUtils.subMonths(end, 1));
      } else if (mode === 'full') {
        start = earliestMonth;
        end = latestMonth;
      } else {
        start = clampMonth(start);
        end = clampMonth(end);
      }
      if (monthUtils.isBefore(end, start)) {
        end = start;
      }
      setStart(start);
      setEnd(end);
      setMode(mode);
    }
  }, [latestTransaction, widget?.meta?.timeFrame, allMonths]);

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    if (!allMonths?.length) {
      return;
    }
    const earliestMonth = allMonths[allMonths.length - 1].name;
    const latestMonth = allMonths[0].name;

    const clampMonth = (m: string) => {
      if (monthUtils.isBefore(m, earliestMonth)) return earliestMonth;
      if (monthUtils.isAfter(m, latestMonth)) return latestMonth;
      return m;
    };

    // For both sliding-window and full modes, ensure end doesn't include current month
    if (mode === 'sliding-window') {
      // Shift both start and end back one month for sliding-window
      start = clampMonth(monthUtils.subMonths(start, 1));
      end = clampMonth(monthUtils.subMonths(end, 1));
    } else if (mode === 'full') {
      start = earliestMonth;
      end = latestMonth;
    } else {
      start = clampMonth(start);
      end = clampMonth(end);
    }
    if (monthUtils.isBefore(end, start)) {
      end = start;
    }
    setStart(start);
    setEnd(end);
    setMode(mode);
  }

  async function onSaveWidget() {
    if (!widget) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Save failed: No widget found to save.'),
          },
        }),
      );
      return;
    }

    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        expenseCategoryIds: selectedExpenseCategories.map(c => c.id),
        incomeAccountIds: selectedIncomeAccountIds,
        safeWithdrawalRate: swr,
        estimatedReturn: useCustomGrowth ? (estimatedReturn ?? 0) : null,
        expectedContribution: useCustomGrowth
          ? (expectedContribution ?? 0)
          : null,
        projectionType,
        expenseAdjustmentFactor,
        showHiddenCategories,
        timeFrame: { start, end, mode },
      },
    });
    dispatch(
      addNotification({
        notification: {
          type: 'message',
          message: t('Dashboard widget successfully saved.'),
        },
      }),
    );
  }

  // Memoize the derived values to avoid recreating them on every render
  const expenseCategoryIds = useMemo(
    () =>
      selectedExpenseCategories
        .filter(c => showHiddenCategories || !c.hidden)
        .map(c => c.id),
    [selectedExpenseCategories, showHiddenCategories],
  );

  const params = useCallback(
    async (
      spreadsheet: ReturnType<typeof useSpreadsheet>,
      setData: (data: CrossoverData) => void,
    ) => {
      // Don't run if dates are not yet initialized
      if (!start || !end) {
        return;
      }

      const crossoverSpreadsheet = createCrossoverSpreadsheet({
        start,
        end,
        expenseCategoryIds,
        incomeAccountIds: selectedIncomeAccountIds,
        safeWithdrawalRate: swr,
        estimatedReturn: useCustomGrowth ? (estimatedReturn ?? 0) : null,
        expectedContribution: useCustomGrowth
          ? (expectedContribution ?? 0)
          : null,
        projectionType,
        expenseAdjustmentFactor,
      });
      await crossoverSpreadsheet(spreadsheet, setData);
    },
    [
      start,
      end,
      swr,
      useCustomGrowth,
      estimatedReturn,
      expectedContribution,
      projectionType,
      expenseAdjustmentFactor,
      expenseCategoryIds,
      selectedIncomeAccountIds,
    ],
  );

  const data = useReport<CrossoverData>('crossover', params);

  // Get the default estimated return from the spreadsheet data
  const historicalReturn = data?.historicalReturn ?? null;

  // Get years to retire from spreadsheet data
  const yearsToRetire = data?.yearsToRetire ?? null;

  // Get target monthly income from spreadsheet data
  const targetMonthlyIncome = data?.targetMonthlyIncome ?? null;

  // Get target nest egg from spreadsheet data
  const targetNestEgg = data?.targetNestEgg ?? null;

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const title = widget?.meta?.name || t('Crossover Point');
  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Save failed: No widget found to save.'),
          },
        }),
      );
      return;
    }

    const name = newName || t('Crossover Point');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
      },
    });
  };

  if (
    !allMonths ||
    !data ||
    !start ||
    !end ||
    isCategoriesLoading ||
    accounts.length === 0
  ) {
    return <LoadingIndicator />;
  }

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={title}
            leftContent={
              <MobileBackButton onPress={() => navigate('/reports')} />
            }
          />
        ) : (
          <PageHeader
            title={
              widget ? (
                <EditablePageHeaderTitle
                  title={title}
                  onSave={onSaveWidgetName}
                />
              ) : (
                title
              )
            }
          />
        )
      }
      padding={0}
    >
      <Header
        start={start}
        end={end}
        mode={mode}
        allMonths={allMonths || []}
        earliestTransaction={earliestTransaction}
        latestTransaction={latestTransaction}
        onChangeDates={onChangeDates}
      >
        {widget && (
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        )}
      </Header>

      <View
        style={{
          flexDirection: 'row',
          paddingLeft: !isNarrowWidth ? 20 : undefined,
          flex: 1,
        }}
      >
        {/* Left sidebar */}
        {!isNarrowWidth && (
          <View
            style={{
              minWidth: 225,
              maxWidth: 250,
              paddingTop: 10,
              paddingRight: 10,
              flexShrink: 0,
              overflowY: 'auto',
            }}
          >
            <View style={{ flexShrink: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text>
                    <Trans>Expenses categories</Trans>
                  </Text>
                  <Tooltip
                    content={
                      <View style={{ maxWidth: 300 }}>
                        <Text>
                          <Trans>
                            Used to estimate your future expenses.
                            <br />
                            <br />
                            Select the budget categories that reflect your
                            living expenses in retirement.
                            <br />
                            Ex: Food, Utilities, Entertainment, Medical
                            <br />
                            <br />
                            Exclude categories that will not continue in
                            retirement.
                            <br />
                            Ex: Retirement Savings
                          </Trans>
                        </Text>
                      </View>
                    }
                    placement="right top"
                    style={{
                      ...styles.tooltip,
                    }}
                  >
                    <SvgQuestion height={12} width={12} cursor="pointer" />
                  </Tooltip>
                </View>
              </div>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 5,
                  flexShrink: 0,
                }}
              >
                <Button
                  variant="bare"
                  onPress={() => setShowHiddenCategories(!showHiddenCategories)}
                  style={{ padding: 8 }}
                >
                  <View>
                    {showHiddenCategories ? (
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <SvgViewHide
                          width={15}
                          height={15}
                          style={{ marginRight: 5 }}
                        />
                        <Text>
                          <Trans>Hide hidden</Trans>
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <SvgViewShow
                          width={15}
                          height={15}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={{
                            maxWidth: 100,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <Trans>Show hidden</Trans>
                        </Text>
                      </View>
                    )}
                  </View>
                </Button>
                <View style={{ flex: 1 }} />
              </View>
              <div
                style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}
              >
                <CategorySelector
                  categoryGroups={expenseCategoryGroups}
                  selectedCategories={selectedExpenseCategories}
                  setSelectedCategories={setSelectedExpenseCategories}
                  showHiddenCategories={showHiddenCategories}
                />
              </div>

              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text>
                    <Trans>Income accounts</Trans>
                  </Text>
                  <Tooltip
                    content={
                      <View style={{ maxWidth: 300 }}>
                        <Text>
                          <Trans>
                            Used to estimate your future income.
                            <br />
                            <br />
                            Select the accounts that will be used to fund your
                            retirement.
                            <br />
                            Ex: Retirement Accounts, Savings Accounts
                            <br />
                            <br />
                            Exclude accounts that will not.
                            <br />
                            Ex: Mortgage Accounts, Child Education Accounts
                          </Trans>
                        </Text>
                      </View>
                    }
                    placement="right top"
                    style={{
                      ...styles.tooltip,
                    }}
                  >
                    <SvgQuestion height={12} width={12} cursor="pointer" />
                  </Tooltip>
                </View>
              </div>
              <div
                style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}
              >
                <AccountSelector
                  accounts={accounts}
                  selectedAccountIds={selectedIncomeAccountIds}
                  setSelectedAccountIds={setSelectedIncomeAccountIds}
                />
              </div>

              <View style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text>{t('Safe withdrawal rate (%)')}</Text>
                    <Tooltip
                      content={
                        <View style={{ maxWidth: 300 }}>
                          <Text>
                            <Trans>
                              The amount you plan to withdraw from your Income
                              Accounts each year to fund your living expenses.
                              <br />
                              <Link
                                variant="external"
                                to="https://en.wikipedia.org/wiki/Retirement_spend-down#Withdrawal_rate"
                              >
                                More info.
                              </Link>
                            </Trans>
                          </Text>
                        </View>
                      }
                      placement="right top"
                      style={{
                        ...styles.tooltip,
                      }}
                    >
                      <SvgQuestion height={12} width={12} cursor="pointer" />
                    </Tooltip>
                  </View>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={swr == null ? '' : Number((swr * 100).toFixed(2))}
                  onChange={e =>
                    setSwr(
                      isNaN(e.target.valueAsNumber)
                        ? 0
                        : e.target.valueAsNumber / 100,
                    )
                  }
                  style={{ width: 120, marginBottom: 12 }}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text>{t('Expense Projection Type')}</Text>
                    <Tooltip
                      content={
                        <View style={{ maxWidth: 300 }}>
                          <Text>
                            <Trans>
                              How past expenses are projected into the future.
                              <br />
                              <br />
                              Hampel Filtered Median: Filters out outliers
                              before calculating the median expense.
                              <br />
                              <br />
                              Median: Uses the median of all historical expenses
                              without filtering.
                              <br />
                              <br />
                              Mean: Uses the average of all historical expenses.
                            </Trans>
                          </Text>
                        </View>
                      }
                      placement="right top"
                      style={{
                        ...styles.tooltip,
                      }}
                    >
                      <SvgQuestion height={12} width={12} cursor="pointer" />
                    </Tooltip>
                  </View>
                </div>
                <Select
                  value={projectionType}
                  onChange={value =>
                    setProjectionType(value as 'hampel' | 'median' | 'mean')
                  }
                  options={[
                    ['hampel', t('Hampel Filtered Median')],
                    ['median', t('Median')],
                    ['mean', t('Mean')],
                  ]}
                  style={{ width: 200, marginBottom: 12 }}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text>{t('Target Income (% of expenses)')}</Text>
                    <Tooltip
                      content={
                        <View style={{ maxWidth: 300 }}>
                          <Text>
                            <Trans>
                              Your target retirement income as a percentage of
                              projected expenses.
                              <br />
                              <br />
                              100% means you need retirement income equal to
                              your current projected expenses.
                              <br />
                              Values above 100% mean you plan to spend more in
                              retirement.
                              <br />
                              Values below 100% mean you plan to spend less in
                              retirement.
                              <br />
                              <br />
                              The graph shows both the projected expenses (solid
                              red line) and your target income (dashed red
                              line).
                            </Trans>
                          </Text>
                        </View>
                      }
                      placement="right top"
                      style={{
                        ...styles.tooltip,
                      }}
                    >
                      <SvgQuestion height={12} width={12} cursor="pointer" />
                    </Tooltip>
                  </View>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={
                    expenseAdjustmentFactor == null
                      ? ''
                      : Number((expenseAdjustmentFactor * 100).toFixed(0))
                  }
                  onChange={e =>
                    setExpenseAdjustmentFactor(
                      isNaN(e.target.valueAsNumber)
                        ? 1.0
                        : e.target.valueAsNumber / 100,
                    )
                  }
                  style={{ width: 120, marginBottom: 12 }}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <label
                  htmlFor="custom-growth"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: 8,
                  }}
                >
                  <Checkbox
                    id="custom-growth"
                    checked={useCustomGrowth}
                    onChange={e => {
                      const checked = e.target.checked;
                      setUseCustomGrowth(checked);
                      // On first enable (when estimatedReturn is null), default to 6%
                      if (checked && estimatedReturn === null) {
                        setEstimatedReturn(0.06);
                      }
                    }}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontWeight: 600 }}>
                    <Trans>Use custom growth projections</Trans>
                  </Text>
                  <Tooltip
                    content={
                      <View style={{ maxWidth: 300 }}>
                        <Text>
                          <Trans>
                            Enable this to specify custom monthly contribution
                            amounts and investment returns that will be used to
                            project your investments into the future.
                            <br />
                            <br />
                            When disabled, uses historical performance from your
                            Income Accounts (which includes both past
                            contributions and investment growth).
                          </Trans>
                        </Text>
                      </View>
                    }
                    placement="right top"
                    style={{
                      ...styles.tooltip,
                    }}
                  >
                    <SvgQuestion
                      height={12}
                      width={12}
                      cursor="pointer"
                      style={{ marginLeft: 4 }}
                    />
                  </Tooltip>
                </label>

                {useCustomGrowth && (
                  <View
                    style={{
                      marginLeft: 24,
                      paddingLeft: 12,
                      borderLeft: `3px solid ${theme.tableBorder}`,
                    }}
                  >
                    <View style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text>{t('Expected return (annual %)')}</Text>
                          <Tooltip
                            content={
                              <View style={{ maxWidth: 300 }}>
                                <Text>
                                  <Trans>
                                    The expected annual return rate for your
                                    investments, used to project growth of
                                    Income Accounts.
                                  </Trans>
                                </Text>
                              </View>
                            }
                            placement="right top"
                            style={{
                              ...styles.tooltip,
                            }}
                          >
                            <SvgQuestion
                              height={12}
                              width={12}
                              cursor="pointer"
                            />
                          </Tooltip>
                        </View>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={
                          estimatedReturn === null
                            ? ''
                            : Number((estimatedReturn * 100).toFixed(2))
                        }
                        onChange={e =>
                          setEstimatedReturn(
                            isNaN(e.target.valueAsNumber)
                              ? null
                              : e.target.valueAsNumber / 100,
                          )
                        }
                        onBlur={() => {
                          if (estimatedReturn === null) {
                            setEstimatedReturn(0);
                          }
                        }}
                        style={{ width: 120 }}
                      />
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text>
                            <Trans>Expected monthly contribution</Trans>
                          </Text>
                          <Tooltip
                            content={
                              <View style={{ maxWidth: 300 }}>
                                <Text>
                                  <Trans>
                                    The amount you plan to contribute to your
                                    Income Accounts each month. This amount is
                                    added to your balance each month before
                                    applying the investment return.
                                  </Trans>
                                </Text>
                              </View>
                            }
                            placement="right top"
                            style={{
                              ...styles.tooltip,
                            }}
                          >
                            <SvgQuestion
                              height={12}
                              width={12}
                              cursor="pointer"
                            />
                          </Tooltip>
                        </View>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={
                          expectedContribution === null
                            ? ''
                            : expectedContribution / 100
                        }
                        onChange={e =>
                          setExpectedContribution(
                            isNaN(e.target.valueAsNumber)
                              ? null
                              : e.target.valueAsNumber * 100,
                          )
                        }
                        onBlur={() => {
                          if (expectedContribution === null) {
                            setExpectedContribution(0);
                          }
                        }}
                        style={{ width: 120 }}
                      />
                    </View>
                  </View>
                )}

                {!useCustomGrowth && historicalReturn != null && (
                  <div
                    style={{
                      fontSize: 12,
                      color: theme.pageTextSubdued,
                      marginLeft: 24,
                    }}
                  >
                    <Trans>
                      Using calculated historical return of{' '}
                      {(historicalReturn * 100).toFixed(1)}%
                    </Trans>
                  </div>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Right content */}
        <View
          style={{
            flex: 1,
          }}
        >
          {/* Header stats */}
          <View
            style={{
              backgroundColor: theme.tableBackground,
              padding: 20,
              paddingTop: 10,
              marginBottom: 10,
            }}
          >
            <View style={{ textAlign: 'right' }}>
              <View
                style={{
                  ...styles.largeText,
                  fontWeight: 400,
                  marginBottom: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>
                  <Trans>Years to Retire</Trans>:{' '}
                  <PrivacyFilter>
                    {yearsToRetire != null
                      ? t('{{years}} years', {
                          years: format(yearsToRetire, 'number'),
                        })
                      : t('N/A')}
                  </PrivacyFilter>
                </span>
              </View>
              <View
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                <span>
                  <Trans>Target Monthly Income</Trans>:{' '}
                  <PrivacyFilter>
                    {targetMonthlyIncome != null &&
                    !isNaN(targetMonthlyIncome) ? (
                      <FinancialText>
                        {format(targetMonthlyIncome, 'financial')}
                      </FinancialText>
                    ) : (
                      t('N/A')
                    )}
                  </PrivacyFilter>
                </span>
              </View>
              <View
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                <span>
                  <Trans>Target Life Savings</Trans>:{' '}
                  <PrivacyFilter>
                    {targetNestEgg != null && !isNaN(targetNestEgg) ? (
                      <FinancialText>
                        {format(targetNestEgg, 'financial')}
                      </FinancialText>
                    ) : (
                      t('N/A')
                    )}
                  </PrivacyFilter>
                </span>
              </View>
            </View>
          </View>

          {/* Graph area */}
          <View
            style={{
              backgroundColor: theme.tableBackground,
              flexDirection: 'row',
              flex: '1 0 auto',
              minHeight: 400,
            }}
          >
            <View
              style={{
                flex: 1,
                padding: 10,
                height: '100%',
              }}
            >
              <CrossoverGraph
                graphData={data.graphData}
                style={{ height: '100%', flex: 1 }}
              />
            </View>
          </View>

          {/* Description */}
          <View
            style={{
              backgroundColor: theme.tableBackground,
              marginTop: 10,
              padding: 20,
              userSelect: 'none',
            }}
          >
            <Paragraph>
              <strong>
                <Trans>What is the Crossover Point?</Trans>
              </strong>
            </Paragraph>
            <Paragraph>
              <Trans>
                The crossover point is when your monthly investment income (from
                selected accounts using the safe withdrawal rate) meets or
                exceeds your total monthly expenses (from selected categories).
                The chart projects into the future using your estimated return
                until the lines cross.
              </Trans>
            </Paragraph>
          </View>
        </View>
      </View>
    </Page>
  );
}
