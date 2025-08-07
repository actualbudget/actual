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
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type SpendingWidget,
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
import { SpendingGraph } from '@desktop-client/components/reports/graphs/SpendingGraph';
import { LegendItem } from '@desktop-client/components/reports/LegendItem';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ModeButton } from '@desktop-client/components/reports/ModeButton';
import { calculateSpendingReportTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createSpendingSpreadsheet } from '@desktop-client/components/reports/spreadsheets/spending-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function Spending() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<SpendingWidget>(
    params.id ?? '',
    'spending-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <SpendingInternal widget={widget} />;
}

type SpendingInternalProps = {
  widget?: SpendingWidget;
};

function SpendingInternal({ widget }: SpendingInternalProps) {
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

  const initialReportMode = widget?.meta?.mode ?? 'single-month';
  const [initialCompare, initialCompareTo] = calculateSpendingReportTimeRange(
    widget?.meta ?? {},
  );
  const [compare, setCompare] = useState(initialCompare);
  const [compareTo, setCompareTo] = useState(initialCompareTo);
  const [isLive, setIsLive] = useState(widget?.meta?.isLive ?? true);

  const [reportMode, setReportMode] = useState(initialReportMode);

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');

      let earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : monthUtils.currentMonth();

      // Make sure the month selects are at least populates with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
      const yearAgo = monthUtils.subMonths(monthUtils.currentMonth(), 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, monthUtils.currentMonth())
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy', locale),
        }))
        .reverse();

      setAllIntervals(allMonths);
    }
    run();
  }, [locale]);

  const getGraphData = useMemo(
    () =>
      createSpendingSpreadsheet({
        conditions,
        conditionsOp,
        compare,
        compareTo,
      }),
    [conditions, conditionsOp, compare, compareTo],
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
        compare,
        compareTo,
        isLive,
        mode: reportMode,
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

  const showAverage =
    data.intervalData[27].months[monthUtils.subMonths(compare, 3)] &&
    Math.abs(
      data.intervalData[27].months[monthUtils.subMonths(compare, 3)].cumulative,
    ) > 0;

  const todayDay =
    compare !== monthUtils.currentMonth()
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;

  const showCompareTo =
    compareTo === monthUtils.currentMonth() ||
    Math.abs(data.intervalData[27].compareTo) > 0;
  const showCompare =
    compare === monthUtils.currentMonth() ||
    Math.abs(data.intervalData[27].compare) > 0;

  const title = widget?.meta?.name || t('Monthly Spending');
  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Monthly Spending');
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
            <Button
              variant={isLive ? 'primary' : 'normal'}
              onPress={() => setIsLive(state => !state)}
            >
              {isLive ? t('Live') : t('Static')}
            </Button>

            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
                marginLeft: 10,
              }}
            />

            <SpaceBetween gap={5}>
              <Text>
                <Trans>Compare</Trans>
              </Text>
              <Select
                value={compare}
                onChange={setCompare}
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
                value={reportMode === 'single-month' ? compareTo : 'label'}
                onChange={setCompareTo}
                options={
                  reportMode === 'single-month'
                    ? allIntervals.map(({ name, pretty }) => [name, pretty])
                    : [
                        [
                          'label',
                          reportMode === 'budget'
                            ? t('Budgeted')
                            : t('Average spent'),
                        ],
                      ]
                }
                disabled={reportMode !== 'single-month'}
                style={{ width: 150 }}
                popoverStyle={{ width: 150 }}
              />
            </SpaceBetween>

            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 15,
                marginLeft: 15,
              }}
            />

            <SpaceBetween gap={5}>
              <ModeButton
                selected={reportMode === 'single-month'}
                style={{
                  backgroundColor: 'inherit',
                }}
                onSelect={() => {
                  setReportMode('single-month');
                }}
              >
                <Trans>Single month</Trans>
              </ModeButton>
              <ModeButton
                selected={reportMode === 'budget'}
                onSelect={() => {
                  setReportMode('budget');
                }}
                style={{
                  backgroundColor: 'inherit',
                }}
              >
                <Trans>Budgeted</Trans>
              </ModeButton>
              <ModeButton
                selected={reportMode === 'average'}
                onSelect={() => {
                  setReportMode('average');
                }}
                style={{
                  backgroundColor: 'inherit',
                }}
              >
                <Trans>Average</Trans>
              </ModeButton>
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
                      <Trans>Save compare and filter options</Trans>
                    </Text>
                  }
                  style={{
                    ...styles.tooltip,
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
                    label={monthUtils.format(compare, 'MMM, yyyy', locale)}
                    style={{ padding: 0, paddingBottom: 10 }}
                  />
                  <LegendItem
                    color={theme.reportsGray}
                    label={
                      reportMode === 'single-month'
                        ? monthUtils.format(compareTo, 'MMM, yyyy', locale)
                        : reportMode === 'budget'
                          ? t('Budgeted')
                          : t('Average')
                    }
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
                    {showCompare && (
                      <AlignedText
                        style={{ marginBottom: 5, minWidth: 210 }}
                        left={
                          <Block>
                            {compare === monthUtils.currentMonth()
                              ? t('Spent {{monthYearFormatted}} MTD', {
                                  monthYearFormatted: monthUtils.format(
                                    compare,
                                    'MMM, yyyy',
                                    locale,
                                  ),
                                })
                              : t('Spent {{monthYearFormatted}}:', {
                                  monthYearFormatted: monthUtils.format(
                                    compare,
                                    'MMM, yyyy',
                                    locale,
                                  ),
                                })}
                            :
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter>
                              {format(
                                Math.abs(data.intervalData[todayDay].compare),
                                'financial',
                              )}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                    )}
                    {reportMode === 'single-month' && showCompareTo && (
                      <AlignedText
                        style={{ marginBottom: 5, minWidth: 210 }}
                        left={
                          <Block>
                            {compareTo === monthUtils.currentMonth()
                              ? t('Spent {{monthYearFormatted}} MTD:', {
                                  monthYearFormatted: monthUtils.format(
                                    compareTo,
                                    'MMM, yyyy',
                                    locale,
                                  ),
                                })
                              : t('Spent {{monthYearFormatted}}:', {
                                  monthYearFormatted: monthUtils.format(
                                    compareTo,
                                    'MMM, yyyy',
                                    locale,
                                  ),
                                })}
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter>
                              {format(
                                Math.abs(data.intervalData[todayDay].compareTo),
                                'financial',
                              )}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                    )}
                  </View>
                  {Math.abs(data.intervalData[todayDay].budget) > 0 && (
                    <AlignedText
                      style={{ marginBottom: 5, minWidth: 210 }}
                      left={
                        <Block>
                          {compare === monthUtils.currentMonth() ? (
                            <Trans>Budgeted MTD</Trans>
                          ) : (
                            <Trans>Budgeted</Trans>
                          )}
                        </Block>
                      }
                      right={
                        <Text style={{ fontWeight: 600 }}>
                          <PrivacyFilter>
                            {format(
                              Math.round(
                                Math.abs(data.intervalData[todayDay].budget),
                              ),
                              'financial',
                            )}
                          </PrivacyFilter>
                        </Text>
                      }
                    />
                  )}
                  {showAverage && (
                    <AlignedText
                      style={{ marginBottom: 5, minWidth: 210 }}
                      left={
                        <Block>
                          {compare === monthUtils.currentMonth()
                            ? t('Spent Average {{monthYearFormatted}} MTD:', {
                                monthYearFormatted: monthUtils.format(
                                  compare,
                                  'MMM, yyyy',
                                ),
                              })
                            : t('Spent Average {{monthYearFormatted}}:', {
                                monthYearFormatted: monthUtils.format(
                                  compare,
                                  'MMM, yyyy',
                                ),
                              })}
                        </Block>
                      }
                      right={
                        <Text style={{ fontWeight: 600 }}>
                          <PrivacyFilter>
                            {format(
                              Math.abs(data.intervalData[todayDay].average),
                              'financial',
                            )}
                          </PrivacyFilter>
                        </Text>
                      }
                    />
                  )}
                </View>
              </View>
              {data ? (
                <SpendingGraph
                  style={{ flexGrow: 1 }}
                  compact={false}
                  data={data}
                  mode={reportMode}
                  compare={compare}
                  compareTo={compareTo}
                />
              ) : (
                <LoadingIndicator message={t('Loading report...')} />
              )}
              {showAverage && (
                <View style={{ marginTop: 30 }}>
                  <Trans>
                    <Paragraph>
                      <strong>
                        How are “Average” and “Spent Average MTD” calculated?
                      </strong>
                    </Paragraph>
                    <Paragraph>
                      They are both the average cumulative spending by day for
                      the three months before the selected “compare” month.
                    </Paragraph>
                  </Trans>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}
