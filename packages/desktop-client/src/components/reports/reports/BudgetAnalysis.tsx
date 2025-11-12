import React, { useState, useMemo, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type BudgetAnalysisWidget,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { AppliedFilters } from '@desktop-client/components/filters/AppliedFilters';
import { FilterButton } from '@desktop-client/components/filters/FiltersMenu';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { BudgetAnalysisGraph } from '@desktop-client/components/reports/graphs/BudgetAnalysisGraph';
import { LegendItem } from '@desktop-client/components/reports/LegendItem';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { createBudgetAnalysisSpreadsheet } from '@desktop-client/components/reports/spreadsheets/budget-analysis-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
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

  const emptyIntervals: { name: string; pretty: string }[] = [];
  const [allIntervals, setAllIntervals] = useState(emptyIntervals);

  const timeFrame = widget?.meta?.timeFrame ?? {
    start: monthUtils.subMonths(monthUtils.currentMonth(), 5),
    end: monthUtils.currentMonth(),
    mode: 'sliding-window' as const,
  };

  const [startMonth, setStartMonth] = useState(timeFrame.start);
  const [endMonth, setEndMonth] = useState(timeFrame.end);

  useEffect(() => {
    async function run() {
      const earliestTrans = await send('get-earliest-transaction');
      const latestTrans = await send('get-latest-transaction');

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

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, latestMonth)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy', locale),
        }))
        .reverse();

      setAllIntervals(allMonths);
    }
    run();
  }, [locale]);

  const startDate = startMonth + '-01';
  const endDate = monthUtils.getMonthEnd(endMonth + '-01');

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
          start: startMonth,
          end: endMonth,
          mode: 'static' as const,
        },
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

  if (!data) {
    return null;
  }

  const latestMonth = data.monthData[data.monthData.length - 1];

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
      <View
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 15,
          paddingBottom: 20,
          flexShrink: 0,
        }}
      >
        {!isNarrowWidth && (
          <SpaceBetween gap={0}>
            <SpaceBetween gap={5}>
              <Text>
                <Trans>From</Trans>
              </Text>
              <Select
                value={startMonth}
                onChange={setStartMonth}
                options={allIntervals.map(
                  ({ name, pretty }) => [name, pretty] as const,
                )}
                style={{ width: 150 }}
                popoverStyle={{ width: 150 }}
              />
              <Text>
                <Trans>to</Trans>
              </Text>
              <Select
                value={endMonth}
                onChange={setEndMonth}
                options={allIntervals.map(
                  ({ name, pretty }) => [name, pretty] as const,
                )}
                style={{ width: 150 }}
                popoverStyle={{ width: 150 }}
              />
            </SpaceBetween>

            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
              }}
            />

            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                flex: 1,
              }}
            >
              <FilterButton
                onApply={onApplyFilter}
                compact={isNarrowWidth}
                hover={false}
                exclude={['date']}
              />
              <View style={{ flex: 1 }} />

              {widget && (
                <Tooltip
                  placement="top end"
                  content={
                    <Text>
                      <Trans>Save date range and filter options</Trans>
                    </Text>
                  }
                  style={{
                    lineHeight: 1.5,
                    padding: '6px 10px',
                    marginLeft: 10,
                  }}
                >
                  <Button
                    variant="primary"
                    style={{
                      marginLeft: 10,
                    }}
                    onPress={onSaveWidget}
                  >
                    <Trans>Save</Trans>
                  </Button>
                </Tooltip>
              )}
            </View>
          </SpaceBetween>
        )}

        {conditions && conditions.length > 0 && (
          <View
            style={{
              marginTop: 5,
              flexShrink: 0,
              flexDirection: 'row',
              spacing: 2,
            }}
          >
            <AppliedFilters
              conditions={conditions}
              onUpdate={onUpdateFilter}
              onDelete={onDeleteFilter}
              conditionsOp={conditionsOp}
              onConditionsOpChange={onConditionsOpChange}
            />
          </View>
        )}
      </View>
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
                  <LegendItem
                    color={theme.reportsBlue}
                    label={t('Balance')}
                    style={{ padding: 0, paddingBottom: 10 }}
                  />
                </View>
                <View style={{ flex: 1 }} />
                <View
                  style={{
                    alignItems: 'flex-end',
                    color: theme.pageText,
                  }}
                >
                  <View>
                    {latestMonth && (
                      <>
                        <AlignedText
                          style={{ marginBottom: 5, minWidth: 210 }}
                          left={
                            <Block>
                              <Trans>
                                Budgeted (
                                {{
                                  month: monthUtils.format(
                                    latestMonth.month,
                                    'MMM yyyy',
                                    locale,
                                  ),
                                }}
                                ):
                              </Trans>
                            </Block>
                          }
                          right={
                            <Text style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(latestMonth.budgeted, 'financial')}
                              </PrivacyFilter>
                            </Text>
                          }
                        />
                        <AlignedText
                          style={{ marginBottom: 5, minWidth: 210 }}
                          left={
                            <Block>
                              <Trans>
                                Spent (
                                {{
                                  month: monthUtils.format(
                                    latestMonth.month,
                                    'MMM yyyy',
                                    locale,
                                  ),
                                }}
                                ):
                              </Trans>
                            </Block>
                          }
                          right={
                            <Text style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(latestMonth.spent, 'financial')}
                              </PrivacyFilter>
                            </Text>
                          }
                        />
                        <AlignedText
                          style={{ marginBottom: 5, minWidth: 210 }}
                          left={
                            <Block>
                              <Trans>
                                Balance (
                                {{
                                  month: monthUtils.format(
                                    latestMonth.month,
                                    'MMM yyyy',
                                    locale,
                                  ),
                                }}
                                ):
                              </Trans>
                            </Block>
                          }
                          right={
                            <Text style={{ fontWeight: 600 }}>
                              <PrivacyFilter>
                                {format(latestMonth.balance, 'financial')}
                              </PrivacyFilter>
                            </Text>
                          }
                        />
                      </>
                    )}
                  </View>
                </View>
              </View>
              {data ? (
                <BudgetAnalysisGraph
                  style={{ flexGrow: 1 }}
                  compact={false}
                  data={data}
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
                    The balance tracks your budget performance month-to-month.
                    It starts with the previous month&apos;s balance, adds the
                    budgeted amount for the current month, and subtracts actual
                    spending. A positive balance indicates under-spending, while
                    a negative balance shows over-spending.
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
