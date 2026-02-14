import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgChart, SvgChartBar } from '@actual-app/components/icons/v1';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type {
  BudgetAnalysisWidget,
  RuleConditionEntity,
  TimeFrame,
} from 'loot-core/types/models';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { FinancialText } from '@desktop-client/components/FinancialText';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { Change } from '@desktop-client/components/reports/Change';
import { BudgetAnalysisGraph } from '@desktop-client/components/reports/graphs/BudgetAnalysisGraph';
import { Header } from '@desktop-client/components/reports/Header';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createBudgetAnalysisSpreadsheet } from '@desktop-client/components/reports/spreadsheets/budget-analysis-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function BudgetAnalysis() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<BudgetAnalysisWidget>(
    params.id ?? '',
    'budget-analysis-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <BudgetAnalysisInternal widget={widget} />;
}

type BudgetAnalysisInternalProps = {
  widget?: BudgetAnalysisWidget;
};

function BudgetAnalysisInternal({ widget }: BudgetAnalysisInternalProps) {
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

  const [allMonths, setAllMonths] = useState<Array<{
    name: string;
    pretty: string;
  }> | null>(null);

  const [start, setStart] = useState(monthUtils.currentMonth());
  const [end, setEnd] = useState(monthUtils.currentMonth());
  const [mode, setMode] = useState<TimeFrame['mode']>('sliding-window');
  const [graphType, setGraphType] = useState<'Line' | 'Bar'>(
    widget?.meta?.graphType || 'Bar',
  );
  const [showBalance, setShowBalance] = useState(
    widget?.meta?.showBalance ?? true,
  );
  const [latestTransaction, setLatestTransaction] = useState('');
  const [isConcise, setIsConcise] = useState(() => {
    // Default to concise (monthly) view until we load the actual date range
    return true;
  });

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const calculateIsConcise = (startMonth: string, endMonth: string) => {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(endMonth + '-01'),
      d.parseISO(startMonth + '-01'),
    );
    return numDays > 31 * 3;
  };

  useEffect(() => {
    async function run() {
      const earliestTrans = await send('get-earliest-transaction');
      const latestTrans = await send('get-latest-transaction');
      const latestTransDate = latestTrans
        ? fromDateRepr(latestTrans.date)
        : monthUtils.currentDay();
      setLatestTransaction(latestTransDate);

      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = earliestTrans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(earliestTrans.date)))
        : currentMonth;
      const latestTransactionMonth = latestTrans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(latestTrans.date)))
        : currentMonth;

      const latestMonth =
        latestTransactionMonth > currentMonth
          ? latestTransactionMonth
          : currentMonth;

      const yearAgo = monthUtils.subMonths(latestMonth, 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allMonthsData = monthUtils
        .rangeInclusive(earliestMonth, latestMonth)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy', locale),
        }))
        .reverse();

      setAllMonths(allMonthsData);

      if (widget?.meta?.timeFrame) {
        const [calculatedStart, calculatedEnd] = calculateTimeRange(
          widget.meta.timeFrame,
          undefined,
          latestTransDate,
        );
        setStart(calculatedStart);
        setEnd(calculatedEnd);
        setMode(widget.meta.timeFrame.mode);

        setIsConcise(calculateIsConcise(calculatedStart, calculatedEnd));
      } else {
        const [liveStart, liveEnd] = calculateTimeRange({
          start: monthUtils.subMonths(currentMonth, 5),
          end: currentMonth,
          mode: 'sliding-window',
        });
        setStart(liveStart);
        setEnd(liveEnd);

        setIsConcise(calculateIsConcise(liveStart, liveEnd));
      }
    }
    run();
  }, [locale, widget?.meta?.timeFrame]);

  const startDate = start + '-01';
  const endDate = monthUtils.getMonthEnd(end + '-01');

  const getGraphData = useMemo(
    () =>
      createBudgetAnalysisSpreadsheet({
        conditions,
        conditionsOp,
        startDate,
        endDate,
      }),
    [conditions, conditionsOp, startDate, endDate],
  );

  const data = useReport('default', getGraphData);
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const onChangeDates = (
    newStart: string,
    newEnd: string,
    newMode: TimeFrame['mode'],
  ) => {
    setStart(newStart);
    setEnd(newEnd);
    setMode(newMode);

    setIsConcise(calculateIsConcise(newStart, newEnd));
  };

  async function onSaveWidget() {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    await send('dashboard-update-widget', {
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
        graphType,
        showBalance,
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

  if (!data || !allMonths) {
    return <LoadingIndicator />;
  }

  const latestInterval = data.intervalData[data.intervalData.length - 1];
  const endingBalance = latestInterval?.balance ?? 0;

  const title = widget?.meta?.name || t('Budget Analysis');
  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Budget Analysis');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
      },
    });
  };

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
        show1Month
        allMonths={allMonths}
        earliestTransaction={allMonths[allMonths.length - 1].name}
        latestTransaction={latestTransaction}
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        onChangeDates={onChangeDates}
        filters={conditions}
        conditionsOp={conditionsOp}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        onConditionsOpChange={onConditionsOpChange}
        filterExclude={[
          'date',
          'account',
          'payee',
          'notes',
          'amount',
          'cleared',
          'reconciled',
          'transfer',
        ]}
        inlineContent={
          <Tooltip
            content={
              graphType === 'Line'
                ? t('Switch to bar chart')
                : t('Switch to line chart')
            }
          >
            <Button
              variant="bare"
              onPress={() =>
                setGraphType(graphType === 'Line' ? 'Bar' : 'Line')
              }
            >
              {graphType === 'Line' ? (
                <SvgChartBar style={{ width: 12, height: 12 }} />
              ) : (
                <SvgChart style={{ width: 12, height: 12 }} />
              )}
            </Button>
          </Tooltip>
        }
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
          display: 'flex',
          flexDirection: 'row',
          paddingTop: 0,
          flexGrow: 1,
        }}
      >
        <View
          style={{
            flexGrow: 1,
          }}
        >
          <View
            style={{
              backgroundColor: theme.tableBackground,
              padding: 20,
              paddingTop: 0,
              flex: '1 0 auto',
              overflowY: 'auto',
            }}
          >
            <View
              style={{
                flexDirection: 'column',
                flexGrow: 1,
                padding: 10,
                paddingTop: 10,
              }}
            >
              <View
                style={{
                  alignItems: 'flex-end',
                  flexDirection: 'row',
                }}
              >
                <View style={{ flex: 1 }} />
                <View
                  style={{
                    alignItems: 'flex-end',
                    color: theme.pageText,
                  }}
                >
                  <View>
                    {data && (
                      <>
                        <AlignedText
                          style={{ marginBottom: 5, minWidth: 210 }}
                          left={
                            <Block>
                              <Trans>Budgeted:</Trans>
                            </Block>
                          }
                          right={
                            <FinancialText style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(data.totalBudgeted, 'financial')}
                              </PrivacyFilter>
                            </FinancialText>
                          }
                        />
                        <AlignedText
                          style={{ marginBottom: 5, minWidth: 210 }}
                          left={
                            <Block>
                              <Trans>Spent:</Trans>
                            </Block>
                          }
                          right={
                            <FinancialText style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(data.totalSpent, 'financial')}
                              </PrivacyFilter>
                            </FinancialText>
                          }
                        />
                        <AlignedText
                          style={{ marginBottom: 5, minWidth: 210 }}
                          left={
                            <Block>
                              <Trans>Overspending adj:</Trans>
                            </Block>
                          }
                          right={
                            <FinancialText style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(
                                  data.totalOverspendingAdjustment,
                                  'financial',
                                )}
                              </PrivacyFilter>
                            </FinancialText>
                          }
                        />
                        {showBalance && (
                          <AlignedText
                            style={{ marginBottom: 5, minWidth: 210 }}
                            left={
                              <Block>
                                <Trans>Ending balance:</Trans>
                              </Block>
                            }
                            right={
                              <FinancialText style={{ fontWeight: 600 }}>
                                <PrivacyFilter>
                                  <Change amount={endingBalance} />
                                </PrivacyFilter>
                              </FinancialText>
                            }
                          />
                        )}
                      </>
                    )}
                  </View>
                </View>
              </View>
              <BudgetAnalysisGraph
                style={{ flexGrow: 1 }}
                data={data}
                graphType={graphType}
                showBalance={showBalance}
                isConcise={isConcise}
              />
              <View style={{ marginTop: 30 }}>
                <Trans>
                  <Paragraph>
                    <strong>Understanding the Chart</strong>
                    <br />• <strong>Budgeted:</strong> The amount you allocated
                    each month
                    <br />• <strong>Spent:</strong> Your actual spending
                    <br />• <strong>Overspending Adjustment:</strong> Amounts
                    from categories without rollover that were reset
                    <br />• <strong>Balance:</strong> Your cumulative budget
                    performance, starting with any prior balance. Respects
                    category rollover settings from your budget.
                  </Paragraph>
                  <Paragraph>
                    <strong>Understanding the Budget Summary</strong>
                    <br />
                    The balance starts from the month before your selected
                    period. Budgeted, spent, and overspending adjustments show
                    totals over the period. Ending balance shows the final
                    balance at period end. You can filter by categories to track
                    changes in a specific area.
                  </Paragraph>
                  <Paragraph>
                    Hint: You can use the icon in the header to toggle between
                    line and bar chart views.
                  </Paragraph>
                </Trans>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}
