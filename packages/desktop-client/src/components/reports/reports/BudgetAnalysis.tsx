import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { SvgCalendar, SvgChartBar, SvgChart } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type BudgetAnalysisWidget,
  type RuleConditionEntity,
  type TimeFrame,
} from 'loot-core/types/models';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { BudgetAnalysisGraph } from '@desktop-client/components/reports/graphs/BudgetAnalysisGraph';
import { Header } from '@desktop-client/components/reports/Header';
import { LegendItem } from '@desktop-client/components/reports/LegendItem';
import { ReportOptions } from '@desktop-client/components/reports/ReportOptions';
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
  const [interval, setInterval] = useState(
    widget?.meta?.interval || 'Monthly',
  );
  const [graphType, setGraphType] = useState<'Line' | 'Bar'>(
    widget?.meta?.graphType || 'Line',
  );
  const [showBalance, setShowBalance] = useState(
    widget?.meta?.showBalance ?? true,
  );
  const [latestTransaction, setLatestTransaction] = useState('');

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  useEffect(() => {
    async function run() {
      const earliestTrans = await send('get-earliest-transaction');
      const latestTrans = await send('get-latest-transaction');
      setLatestTransaction(
        latestTrans ? fromDateRepr(latestTrans.date) : monthUtils.currentDay(),
      );

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
        );
        setStart(calculatedStart);
        setEnd(calculatedEnd);
        setMode(widget.meta.timeFrame.mode);
      } else {
        const [liveStart, liveEnd] = calculateTimeRange({
          start: monthUtils.subMonths(currentMonth, 5),
          end: currentMonth,
          mode: 'sliding-window',
        });
        setStart(liveStart);
        setEnd(liveEnd);
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
        interval,
        firstDayOfWeekIdx,
      }),
    [conditions, conditionsOp, startDate, endDate, interval, firstDayOfWeekIdx],
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
        interval,
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
        inlineContent={
          <>
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
              <span style={{ marginLeft: 6 }}>
                {graphType === 'Line' ? t('Bar chart') : t('Line chart')}
              </span>
            </Button>
            <IntervalSelector interval={interval} onChange={setInterval} />
          </>
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
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <View>
                  <LegendItem
                    color={theme.reportsGreen}
                    label={t('Budgeted')}
                    style={{ padding: 0, paddingBottom: 10 }}
                  />
                  <LegendItem
                    color={theme.reportsRed}
                    label={t('Spent')}
                    style={{ padding: 0, paddingBottom: 10 }}
                  />
                  {showBalance && (
                    <LegendItem
                      color={theme.reportsBlue}
                      label={t('Balance')}
                      style={{ padding: 0, paddingBottom: 10 }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }} />
                <View
                  style={{
                    alignItems: 'flex-end',
                    color: theme.pageText,
                  }}
                >
                  <View>
                    {latestInterval && (
                      <>
                        <AlignedText
                          style={{ marginBottom: 5, minWidth: 210 }}
                          left={
                            <Block>
                              <Trans>Budgeted:</Trans>
                            </Block>
                          }
                          right={
                            <Text style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(latestInterval.budgeted, 'financial')}
                              </PrivacyFilter>
                            </Text>
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
                            <Text style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(latestInterval.spent, 'financial')}
                              </PrivacyFilter>
                            </Text>
                          }
                        />
                        {showBalance && (
                          <AlignedText
                            style={{ marginBottom: 5, minWidth: 210 }}
                            left={
                              <Block>
                                <Trans>Balance:</Trans>
                              </Block>
                            }
                            right={
                              <Text style={{ fontWeight: 600 }}>
                                <PrivacyFilter>
                                  {format(latestInterval.balance, 'financial')}
                                </PrivacyFilter>
                              </Text>
                            }
                          />
                        )}
                      </>
                    )}
                  </View>
                </View>
              </View>
              {data ? (
                <BudgetAnalysisGraph
                  style={{ flexGrow: 1 }}
                  data={data}
                  graphType={graphType}
                  interval={interval}
                  showBalance={showBalance}
                />
              ) : (
                <LoadingIndicator message={t('Loading report...')} />
              )}
              <View style={{ marginTop: 30 }}>
                <Trans>
                  <Paragraph>
                    <strong>How is the Budget Balance calculated?</strong>
                  </Paragraph>
                  <Paragraph>
                    The balance tracks your budget performance over time. It
                    starts with the previous interval&apos;s balance, adds the
                    budgeted amount for the current interval, and subtracts
                    actual spending. A positive balance indicates under-spending
                    while a negative balance shows over-spending.
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

// Interval selector component matching Net Worth style (icon + popover menu)
function IntervalSelector({
  interval,
  onChange,
}: {
  interval: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  onChange: (val: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly') => void;
}) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel =
    ReportOptions.interval.find(opt => opt.key === interval)?.description ??
    interval;

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        aria-label={t('Change interval')}
      >
        <SvgCalendar style={{ width: 12, height: 12 }} />
        <span style={{ marginLeft: 5 }}>{currentLabel}</span>
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={item => {
            onChange(item as 'Daily' | 'Weekly' | 'Monthly' | 'Yearly');
            setIsOpen(false);
          }}
          items={ReportOptions.interval.map(({ key, description }) => ({
            name: key as 'Daily' | 'Weekly' | 'Monthly' | 'Yearly',
            text: description,
          }))}
        />
      </Popover>
    </>
  );
}
