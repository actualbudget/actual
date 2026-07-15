import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDownload } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Paragraph } from '@actual-app/components/paragraph';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  BudgetAnalysisWidget,
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';
import * as d from 'date-fns';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { FinancialText } from '#components/FinancialText';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { Change } from '#components/reports/Change';
import { BudgetAnalysisGraph } from '#components/reports/graphs/BudgetAnalysisGraph';
import { Header } from '#components/reports/Header';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { buildBudgetAnalysisCsv } from '#components/reports/spreadsheets/budget-analysis-export';
import { createBudgetAnalysisSpreadsheet } from '#components/reports/spreadsheets/budget-analysis-spreadsheet';
import { useReport } from '#components/reports/useReport';
import { fromDateRepr } from '#components/reports/util';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { useRuleConditionFilters } from '#hooks/useRuleConditionFilters';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

type OptionsButtonProps = {
  graphType: 'Line' | 'Bar';
  onToggleGraphType: () => void;
  showBalance: boolean;
  onToggleShowBalance: () => void;
  showCategories: boolean;
  onToggleShowCategories: () => void;
  showHiddenCategories: boolean;
  onToggleShowHiddenCategories: () => void;
};

function OptionsButton({
  graphType,
  onToggleGraphType,
  showBalance,
  onToggleShowBalance,
  showCategories,
  onToggleShowCategories,
  showHiddenCategories,
  onToggleShowHiddenCategories,
}: OptionsButtonProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button ref={triggerRef} onPress={() => setIsOpen(true)}>
        <Trans>Options</Trans>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom end"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={item => {
            if (item === 'graph-type') onToggleGraphType();
            if (item === 'show-balance') onToggleShowBalance();
            if (item === 'show-categories') onToggleShowCategories();
            if (item === 'show-hidden-categories') {
              onToggleShowHiddenCategories();
            }
          }}
          items={[
            {
              name: 'graph-type',
              text: t('Bar chart'),
              toggle: graphType === 'Bar',
            },
            Menu.line,
            {
              name: 'show-balance',
              text: t('Show balance'),
              toggle: showBalance,
            },
            {
              name: 'show-categories',
              text: t('Show categories'),
              toggle: showCategories,
            },
            Menu.line,
            {
              name: 'show-hidden-categories',
              text: t('Show hidden categories'),
              toggle: showHiddenCategories,
            },
          ]}
        />
      </Popover>
    </>
  );
}

export function BudgetAnalysis() {
  const params = useParams();
  const { data: widget, isPending } = useDashboardWidget<BudgetAnalysisWidget>({
    id: params.id,
    type: 'budget-analysis-card',
  });

  if (isPending) {
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
  const [showCategories, setShowCategories] = useState(
    !(widget?.meta?.balanceOnly ?? false),
  );
  const [showHiddenCategories, setShowHiddenCategories] = useState(
    widget?.meta?.showHiddenCategories ?? false,
  );
  const [latestTransaction, setLatestTransaction] = useState('');
  const [isConcise, setIsConcise] = useState(() => {
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
    void run();
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
        showHiddenCategories,
      }),
    [conditions, conditionsOp, startDate, endDate, showHiddenCategories],
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
            graphType,
            showBalance,
            balanceOnly: !showCategories,
            showHiddenCategories,
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

  const onExportCsv = () => {
    if (!data) return;
    const csv = buildBudgetAnalysisCsv(data.intervalData);
    const reportName = (widget?.meta?.name || t('Budget Analysis'))
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
    void window.Actual.saveFile(
      csv,
      `${reportName}-${start}-${end}.csv`,
      t('Export budget analysis'),
    );
  };

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
        filterInclude={['category', 'saved']}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <OptionsButton
            graphType={graphType}
            onToggleGraphType={() =>
              setGraphType(graphType === 'Line' ? 'Bar' : 'Line')
            }
            showBalance={showBalance}
            onToggleShowBalance={() => setShowBalance(v => !v)}
            showCategories={showCategories}
            onToggleShowCategories={() => setShowCategories(v => !v)}
            showHiddenCategories={showHiddenCategories}
            onToggleShowHiddenCategories={() =>
              setShowHiddenCategories(v => !v)
            }
          />

          <Tooltip content={t('Export as CSV')}>
            <Button
              variant="bare"
              onPress={onExportCsv}
              aria-label={t('Export as CSV')}
            >
              <SvgDownload style={{ width: 16, height: 16 }} />
            </Button>
          </Tooltip>

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
                balanceOnly={!showCategories}
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
                    Use the <strong>Options</strong> button to switch between
                    line and bar chart, toggle balance and category series
                    visibility, and include hidden budget categories.
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
