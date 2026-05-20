import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import { ungroupTransactions } from '@actual-app/core/shared/transactions';
import type {
  CashFlowWidget,
  RuleConditionEntity,
  TimeFrame,
  TransactionEntity,
} from '@actual-app/core/types/models';
import * as d from 'date-fns';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { FinancialText } from '#components/FinancialText';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { TransactionList as TransactionListMobile } from '#components/mobile/transactions/TransactionList';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { Change } from '#components/reports/Change';
import { CashFlowGraph } from '#components/reports/graphs/CashFlowGraph';
import { Header } from '#components/reports/Header';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { cashFlowByDate } from '#components/reports/spreadsheets/cash-flow-spreadsheet';
import type { CashFlowGranularity } from '#components/reports/spreadsheets/cash-flow-spreadsheet';
import { useReport } from '#components/reports/useReport';
import type { TableHandleRef } from '#components/table';
import { TransactionList } from '#components/transactions/TransactionList';
import { useAccounts } from '#hooks/useAccounts';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useCategories } from '#hooks/useCategories';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useDateFormat } from '#hooks/useDateFormat';
import { DisplayPayeeProvider } from '#hooks/useDisplayPayee';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { usePayees } from '#hooks/usePayees';
import { useRuleConditionFilters } from '#hooks/useRuleConditionFilters';
import { SelectedProviderWithItems } from '#hooks/useSelected';
import { SplitsExpandedProvider } from '#hooks/useSplitsExpanded';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useTransactions } from '#hooks/useTransactions';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

export const defaultTimeFrame = {
  start: monthUtils.dayFromDate(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  ),
  end: monthUtils.currentDay(),
  mode: 'sliding-window',
} satisfies TimeFrame;

// Read-only transaction list mounted below the chart doesn't support
// sorting/editing/batch ops; pass this for the required handler props.
function noopHandler(): void {
  return;
}

export function CashFlow() {
  const params = useParams();
  const { data: widget, isPending } = useDashboardWidget<CashFlowWidget>({
    id: params.id,
    type: 'cash-flow-card',
  });

  if (isPending) {
    return <LoadingIndicator />;
  }

  return <CashFlowInner widget={widget} />;
}

type CashFlowInnerProps = {
  widget?: CashFlowWidget;
};

function CashFlowInner({ widget }: CashFlowInnerProps) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const format = useFormat();

  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useRuleConditionFilters<RuleConditionEntity>(
    widget?.meta?.conditions,
    widget?.meta?.conditionsOp,
  );

  const [allMonths, setAllMonths] = useState<null | Array<{
    name: string;
    pretty: string;
  }>>(null);

  const [start, setStart] = useState(monthUtils.currentMonth());
  const [end, setEnd] = useState(monthUtils.currentMonth());
  const [mode, setMode] = useState<TimeFrame['mode']>('sliding-window');
  const [showBalance, setShowBalance] = useState(
    widget?.meta?.showBalance ?? true,
  );
  const [latestTransaction, setLatestTransaction] = useState('');

  const [granularity, setGranularity] = useState<CashFlowGranularity>(
    widget?.meta?.interval ?? 'Monthly',
  );

  useEffect(() => {
    if (widget?.meta?.interval) {
      return;
    }
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start),
    );
    setGranularity(numDays > 31 * 3 ? 'Monthly' : 'Daily');
  }, [start, end, widget?.meta?.interval]);

  const params = useMemo(
    () =>
      cashFlowByDate(
        start,
        end,
        granularity,
        conditions,
        conditionsOp,
        locale,
        format,
      ),
    [start, end, granularity, conditions, conditionsOp, locale, format],
  );
  const data = useReport('cash_flow', params);

  const [transactionsQuery, setTransactionsQuery] = useState<Query | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    })
      .then(result => {
        if (cancelled) return;
        const query = q('transactions')
          .filter({
            [conditionsOpKey]: result.filters,
          })
          .filter({
            $and: [
              { date: { $gte: monthUtils.firstDayOfMonth(start) } },
              { date: { $lte: monthUtils.lastDayOfMonth(end) } },
            ],
            'account.offbudget': false,
          })
          .select('*')
          .options({ splits: 'grouped' });

        setTransactionsQuery(query);
      })
      .catch(error => {
        console.error('Error generating transaction filters:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [start, end, conditions, conditionsOp]);

  const {
    transactions: transactionsGrouped,
    fetchNextPage: loadMoreTransactions,
  } = useTransactions({ query: transactionsQuery });

  const allTransactions = useMemo(
    () => ungroupTransactions(transactionsGrouped as TransactionEntity[]),
    [transactionsGrouped],
  );

  const { data: accounts = [] } = useAccounts();
  const { data: payees = [] } = usePayees();
  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const dateFormat = useDateFormat();
  const transactionsTableRef = useRef<TableHandleRef<TransactionEntity>>(null);
  const transactionsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function run() {
      const earliestTransaction = await send('get-earliest-transaction');
      setEarliestTransaction(
        earliestTransaction
          ? earliestTransaction.date
          : monthUtils.currentDay(),
      );

      const latestTransaction = await send('get-latest-transaction');
      setLatestTransaction(
        latestTransaction ? latestTransaction.date : monthUtils.currentDay(),
      );

      const currentMonth = monthUtils.currentMonth();
      const earliestMonth = earliestTransaction
        ? monthUtils.monthFromDate(d.parseISO(earliestTransaction.date))
        : currentMonth;
      const latestTransactionMonth = latestTransaction
        ? monthUtils.monthFromDate(d.parseISO(latestTransaction.date))
        : currentMonth;

      const latestMonth =
        latestTransactionMonth > currentMonth
          ? latestTransactionMonth
          : currentMonth;

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, latestMonth)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM yyyy', locale),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    void run();
  }, [locale]);

  useEffect(() => {
    if (latestTransaction) {
      const [initialStart, initialEnd, initialMode] = calculateTimeRange(
        widget?.meta?.timeFrame,
        defaultTimeFrame,
        latestTransaction,
      );
      setStart(initialStart);
      setEnd(initialEnd);
      setMode(initialMode);
    }
  }, [latestTransaction, widget?.meta?.timeFrame]);

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    setStart(start);
    setEnd(end);
    setMode(mode);
  }

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  async function onSaveWidget() {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            conditions,
            conditionsOp,
            timeFrame: {
              start,
              end,
              mode,
            },
            showBalance,
            interval: granularity,
          },
        },
      },
      {
        onSuccess: () => {
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t('Dashboard widget successfully saved.'),
              },
            }),
          );
        },
      },
    );
  }

  const title = widget?.meta?.name || t('Cash Flow');
  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Cash Flow');
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          name,
        },
      },
    });
  };

  const [earliestTransaction, setEarliestTransaction] = useState('');
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  if (!allMonths || !data) {
    return null;
  }

  const { graphData, totalExpenses, totalIncome, totalTransfers } = data;

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
        allMonths={allMonths}
        start={start}
        end={end}
        earliestTransaction={earliestTransaction}
        latestTransaction={latestTransaction}
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        mode={mode}
        show1Month
        onChangeDates={onChangeDates}
        onApply={onApplyFilter}
        filters={conditions}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button onPress={() => setShowBalance(state => !state)}>
            {showBalance ? t('Hide balance') : t('Show balance')}
          </Button>

          {widget && (
            <Button variant="primary" onPress={onSaveWidget}>
              <Trans>Save widget</Trans>
            </Button>
          )}
        </View>
      </Header>
      <View
        style={{
          backgroundColor: theme.tableBackground,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: isNarrowWidth ? 'auto' : 'hidden',
        }}
      >
        <View
          style={{
            padding: 20,
            paddingTop: 0,
            flexShrink: 0,
          }}
        >
          <View
            style={{
              paddingTop: 20,
              alignItems: 'flex-end',
              color: theme.pageText,
            }}
          >
            <AlignedText
              style={{ marginBottom: 5, minWidth: 160 }}
              left={
                <Block>
                  <Trans>Income:</Trans>
                </Block>
              }
              right={
                <FinancialText style={{ fontWeight: 600 }}>
                  <PrivacyFilter>
                    {format(totalIncome, 'financial')}
                  </PrivacyFilter>
                </FinancialText>
              }
            />

            <AlignedText
              style={{ marginBottom: 5, minWidth: 160 }}
              left={
                <Block>
                  <Trans>Expenses:</Trans>
                </Block>
              }
              right={
                <FinancialText style={{ fontWeight: 600 }}>
                  <PrivacyFilter>
                    {format(totalExpenses, 'financial')}
                  </PrivacyFilter>
                </FinancialText>
              }
            />

            <AlignedText
              style={{ marginBottom: 5, minWidth: 160 }}
              left={
                <Block>
                  <Trans>Transfers:</Trans>
                </Block>
              }
              right={
                <FinancialText style={{ fontWeight: 600 }}>
                  <PrivacyFilter>
                    {format(totalTransfers, 'financial')}
                  </PrivacyFilter>
                </FinancialText>
              }
            />
            <Text style={{ fontWeight: 600 }}>
              <PrivacyFilter>
                <Change amount={totalIncome + totalExpenses + totalTransfers} />
              </PrivacyFilter>
            </Text>
          </View>

          <CashFlowGraph
            graphData={graphData}
            granularity={granularity}
            showBalance={showBalance}
          />

          <View
            style={{
              marginTop: 30,
              userSelect: 'none',
            }}
          >
            <Trans>
              <Paragraph>
                <strong>How is cash flow calculated?</strong>
              </Paragraph>
              <Paragraph>
                Cash flow shows the balance of your budgeted accounts over time,
                and the amount of expenses/income for each period (day, month,
                or year). Your budgeted accounts are considered to be "cash on
                hand," so this gives you a picture of how available money
                fluctuates.
              </Paragraph>
            </Trans>
          </View>
        </View>

        <View
          style={{
            flex: isNarrowWidth ? '0 0 auto' : 1,
            minHeight: isNarrowWidth ? undefined : 300,
            display: 'flex',
            flexDirection: 'column',
            overflow: isNarrowWidth ? undefined : 'hidden',
            borderTop: `1px solid ${theme.tableBorder}`,
          }}
        >
          <SelectedProviderWithItems
            name="transactions"
            items={[]}
            fetchAllIds={async () => []}
            registerDispatch={noopHandler}
            selectAllFilter={(item: TransactionEntity) =>
              !item._unmatched && !item.is_parent
            }
          >
            <SchedulesProvider query={undefined}>
              {!isNarrowWidth ? (
                <SplitsExpandedProvider initialMode="collapse">
                  <View
                    style={{
                      width: '100%',
                      flexGrow: 1,
                      overflow: 'hidden',
                    }}
                    ref={transactionsContainerRef}
                  >
                    <TransactionList
                      tableRef={transactionsTableRef}
                      account={undefined}
                      transactions={transactionsGrouped as TransactionEntity[]}
                      allTransactions={allTransactions}
                      loadMoreTransactions={loadMoreTransactions}
                      accounts={accounts}
                      category={undefined}
                      categoryGroups={categoryGroups}
                      payees={payees}
                      balances={null}
                      showBalances={false}
                      showReconciled
                      showCleared={false}
                      showAccount
                      isAdding={false}
                      isNew={() => false}
                      isMatched={() => false}
                      dateFormat={dateFormat}
                      hideFraction={false}
                      renderEmpty={() => (
                        <View
                          style={{
                            color: theme.tableText,
                            marginTop: 20,
                            textAlign: 'center',
                            fontStyle: 'italic',
                          }}
                        >
                          <Trans>No transactions</Trans>
                        </View>
                      )}
                      onSort={noopHandler}
                      sortField=""
                      ascDesc="desc"
                      onChange={noopHandler}
                      onRefetch={noopHandler}
                      onCloseAddTransaction={noopHandler}
                      onCreatePayee={async () => null}
                      onApplyFilter={noopHandler}
                      onBatchDelete={noopHandler}
                      onBatchDuplicate={noopHandler}
                      onBatchLinkSchedule={noopHandler}
                      onBatchUnlinkSchedule={noopHandler}
                      onCreateRule={noopHandler}
                      onScheduleAction={noopHandler}
                      onMakeAsNonSplitTransactions={noopHandler}
                      showSelection={false}
                      allowSplitTransaction={false}
                      allowReorder={false}
                    />
                  </View>
                </SplitsExpandedProvider>
              ) : (
                <DisplayPayeeProvider transactions={allTransactions}>
                  <TransactionListMobile
                    isLoading={false}
                    onLoadMore={loadMoreTransactions}
                    transactions={allTransactions}
                    onOpenTransaction={transaction =>
                      navigate(`/transactions/${transaction.id}`)
                    }
                    isLoadingMore={false}
                  />
                </DisplayPayeeProvider>
              )}
            </SchedulesProvider>
          </SelectedProviderWithItems>
        </View>
      </View>
    </Page>
  );
}
