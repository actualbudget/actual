import React, { useState, useMemo, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import * as d from 'date-fns';

import { useWidget } from 'loot-core/client/data-hooks/widget';
import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';
import { type SpendingWidget } from 'loot-core/types/models';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useFilters } from '../../../hooks/useFilters';
import { useNavigate } from '../../../hooks/useNavigate';
import { useDispatch } from '../../../redux';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Button } from '../../common/Button2';
import { Paragraph } from '../../common/Paragraph';
import { Select } from '../../common/Select';
import { SpaceBetween } from '../../common/SpaceBetween';
import { Text } from '../../common/Text';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';
import { EditablePageHeaderTitle } from '../../EditablePageHeaderTitle';
import { AppliedFilters } from '../../filters/AppliedFilters';
import { FilterButton } from '../../filters/FiltersMenu';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { SpendingGraph } from '../graphs/SpendingGraph';
import { LegendItem } from '../LegendItem';
import { LoadingIndicator } from '../LoadingIndicator';
import { ModeButton } from '../ModeButton';
import { calculateSpendingReportTimeRange } from '../reportRanges';
import { createSpendingSpreadsheet } from '../spreadsheets/spending-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

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
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters<RuleConditionEntity>(
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
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllIntervals(allMonths);
    }
    run();
  }, []);

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
        type: 'message',
        message: t('Dashboard widget successfully saved.'),
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
                    label={monthUtils.format(compare, 'MMM, yyyy')}
                    style={{ padding: 0, paddingBottom: 10 }}
                  />
                  <LegendItem
                    color={theme.reportsGray}
                    label={
                      reportMode === 'single-month'
                        ? monthUtils.format(compareTo, 'MMM, yyyy')
                        : reportMode === 'budget'
                          ? 'Budgeted'
                          : 'Average'
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
                            Spent {monthUtils.format(compare, 'MMM, yyyy')}
                            {compare === monthUtils.currentMonth() && ' MTD'}:
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter>
                              {amountToCurrency(
                                Math.abs(data.intervalData[todayDay].compare),
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
                            Spent {monthUtils.format(compareTo, 'MMM, yyyy')}
                            {compare === monthUtils.currentMonth() && ' MTD'}:
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter>
                              {amountToCurrency(
                                Math.abs(data.intervalData[todayDay].compareTo),
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
                          Budgeted
                          {compare === monthUtils.currentMonth() && ' MTD'}:
                        </Block>
                      }
                      right={
                        <Text style={{ fontWeight: 600 }}>
                          <PrivacyFilter>
                            {amountToCurrency(
                              Math.abs(data.intervalData[todayDay].budget),
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
                          Spent Average
                          {compare === monthUtils.currentMonth() && ' MTD'}:
                        </Block>
                      }
                      right={
                        <Text style={{ fontWeight: 600 }}>
                          <PrivacyFilter>
                            {amountToCurrency(
                              Math.abs(data.intervalData[todayDay].average),
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
