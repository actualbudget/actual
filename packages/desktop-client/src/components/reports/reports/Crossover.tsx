import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type CrossoverWidget,
  type TimeFrame,
  type CategoryEntity,
} from 'loot-core/types/models';

import { Link } from '@desktop-client/components/common/Link';
import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
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
import { createCrossoverSpreadsheet } from '@desktop-client/components/reports/spreadsheets/crossover-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

// Type for the return value of the recalculate function
type CrossoverData = {
  graphData: {
    data: Array<{
      x: string;
      investmentIncome: number;
      expenses: number;
      isProjection?: boolean;
    }>;
    start: string;
    end: string;
    crossoverXLabel: string | null;
  };
  lastKnownBalance: number;
  lastKnownMonthlyIncome: number;
  lastKnownMonthlyExpenses: number;
  historicalReturn: number | null;
  yearsToRetire: number | null;
  targetMonthlyIncome: number | null;
};

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
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const accounts = useAccounts();
  const categories = useCategories();
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
  const [earliestTransactionDate, setEarliestTransactionDate] =
    useState<string>('');

  const [selectedExpenseCategories, setSelectedExpenseCategories] =
    useState<Array<CategoryEntity>>(expenseCategories);
  const [selectedIncomeAccountIds, setSelectedIncomeAccountIds] = useState<
    string[]
  >(accounts.map(a => a.id));

  const [swr, setSwr] = useState(0.04);
  const [estimatedReturn, setEstimatedReturn] = useState<number | null>(null);
  const [projectionType, setProjectionType] = useState<'trend' | 'hampel'>(
    'hampel',
  );
  const [showHiddenCategories, setShowHiddenCategories] = useState(false);
  const [selectionsInitialized, setSelectionsInitialized] = useState(false);

  // reset when widget changes
  useEffect(() => {
    setSelectionsInitialized(false);
  }, [widget?.id]);

  // initialize once when data is available
  useEffect(() => {
    if (
      selectionsInitialized ||
      accounts.length === 0 ||
      categories.list.length === 0
    ) {
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
    setEstimatedReturn(widget?.meta?.estimatedReturn ?? null);
    setProjectionType(widget?.meta?.projectionType ?? 'hampel');
    setShowHiddenCategories(widget?.meta?.showHiddenCategories ?? false);

    setSelectionsInitialized(true);
  }, [selectionsInitialized, accounts, categories.list, widget?.meta]);

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      const currentMonth = monthUtils.currentMonth();
      const earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : currentMonth;
      const latestMonth = monthUtils.subMonths(currentMonth, 1);

      // Initialize date range from widget meta or use default range
      let startMonth = earliestMonth;
      let endMonth = monthUtils.isBefore(startMonth, latestMonth)
        ? latestMonth
        : startMonth;
      let timeMode: TimeFrame['mode'] = 'static';

      if (widget?.meta?.timeFrame?.start && widget?.meta?.timeFrame?.end) {
        startMonth = widget.meta.timeFrame.start;
        endMonth = widget.meta.timeFrame.end;
        timeMode = widget.meta.timeFrame.mode || 'static';
      }

      setStart(startMonth);
      setEnd(endMonth);
      setMode(timeMode);
      setEarliestTransactionDate(earliestMonth);

      const months = monthUtils
        .rangeInclusive(earliestMonth, latestMonth)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllMonths(months);
    }
    run();
  }, [widget?.meta?.timeFrame]);

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    if (mode === 'sliding-window') {
      // This is because we don't include the current month in the sliding window
      start = monthUtils.subMonths(start, 1);
      end = monthUtils.subMonths(end, 1);
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
        estimatedReturn,
        projectionType,
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
        estimatedReturn,
        projectionType,
      });
      await crossoverSpreadsheet(spreadsheet, setData);
    },
    [
      start,
      end,
      swr,
      estimatedReturn,
      projectionType,
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
    categories.list.length === 0 ||
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
        earliestTransaction={earliestTransactionDate}
        onChangeDates={onChangeDates}
        conditionsOp="and"
        onUpdateFilter={() => {}}
        onDeleteFilter={() => {}}
        onConditionsOpChange={() => {}}
        latestTransaction=""
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
                              Linear Trend: Projects expenses using a linear
                              regression of historical data.
                              <br />
                              <br />
                              Hampel Filtered Median: Filters out outliers
                              before calculating the median expense.
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
                    setProjectionType(value as 'trend' | 'hampel')
                  }
                  options={[
                    ['trend', t('Linear Trend')],
                    ['hampel', t('Hampel Filtered Median')],
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
                    <Text>{t('Estimated return (annual %, optional)')}</Text>
                    <Tooltip
                      content={
                        <View style={{ maxWidth: 300 }}>
                          <Text>
                            <Trans>
                              The expected annual return rate for your
                              investments, used to project growth of Income
                              Accounts. If not specified, the historical return
                              from your Income Accounts will be used instead.
                              <br />
                              <br />
                              Note: Historical return calculation includes
                              contributions and may not reflect actual
                              investment performance.
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
                  value={
                    estimatedReturn == null
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
                  style={{ width: 120 }}
                />
                {estimatedReturn == null && historicalReturn != null && (
                  <div
                    style={{
                      fontSize: 12,
                      color: theme.pageTextSubdued,
                      marginTop: 4,
                    }}
                  >
                    <Trans>
                      Using historical return:{' '}
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
                    {targetMonthlyIncome != null && !isNaN(targetMonthlyIncome)
                      ? format(targetMonthlyIncome, 'financial')
                      : t('N/A')}
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
