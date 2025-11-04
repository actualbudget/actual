import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useParams } from 'react-router';

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
import { type SankeyData } from 'recharts/types/chart/Sankey';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type SankeyWidget,
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
import { SankeyGraph } from '@desktop-client/components/reports/graphs/SankeyGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ModeButton } from '@desktop-client/components/reports/ModeButton';
import { createSpreadsheet as sankeySpreadsheet } from '@desktop-client/components/reports/spreadsheets/sankey-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function Sankey() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<SankeyWidget>(
    params.id ?? '',
    'sankey-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <SankeyInner widget={widget} />;
}

type SankeyInnerProps = {
  widget?: SankeyWidget;
};
function SankeyInner({ widget }: SankeyInnerProps) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

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

  const emptyMonths: { name: string; pretty: string }[] = [];
  const [allMonths, setAllMonths] = useState(emptyMonths);

  const initialMonth =
    widget?.meta?.timeFrame?.start ?? monthUtils.currentMonth();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const initialMode = widget?.meta?.mode ?? 'budgeted';
  const [mode, setMode] = useState<'budgeted' | 'spent' | 'difference'>(
    initialMode,
  );

  const categories = useCategories();

  const reportParams = useMemo(
    () =>
      sankeySpreadsheet(
        selectedMonth,
        selectedMonth,
        categories.grouped,
        conditions,
        conditionsOp,
        mode,
      ),
    [selectedMonth, categories, conditions, conditionsOp, mode],
  );
  const data = useReport('sankey', reportParams);

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

      // Make sure the month selects are at least populated with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
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

      setAllMonths(allMonths);
    }
    run();
  }, [locale]);

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
        mode,
        timeFrame: {
          start: selectedMonth,
          end: selectedMonth,
          mode: 'static',
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

  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Sankey');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
      },
    });
  };

  const title = widget?.meta?.name || t('Sankey');

  if (!data) {
    return null;
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
                <Trans>Month</Trans>
              </Text>
              <Select
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={allMonths.map(
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
                marginLeft: 10,
              }}
            />

            <SpaceBetween gap={5}>
              <ModeButton
                selected={mode === 'budgeted'}
                onSelect={() => {
                  setMode('budgeted');
                }}
                style={{
                  backgroundColor: 'inherit',
                }}
              >
                <Trans>Budgeted</Trans>
              </ModeButton>
              <ModeButton
                selected={mode === 'spent'}
                style={{
                  backgroundColor: 'inherit',
                }}
                onSelect={() => {
                  setMode('spent');
                }}
              >
                <Trans>Spent</Trans>
              </ModeButton>
              <ModeButton
                selected={mode === 'difference'}
                style={{
                  backgroundColor: 'inherit',
                }}
                onSelect={() => {
                  setMode('difference');
                }}
              >
                <Trans>Difference</Trans>
              </ModeButton>
            </SpaceBetween>

            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
                marginLeft: 10,
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
                      <Trans>Save month and filter options</Trans>
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
              {data && data.links && data.links.length > 0 ? (
                <SankeyGraph
                  style={{ flexGrow: 1 }}
                  data={data as SankeyData}
                />
              ) : (
                <View
                  style={{
                    flexGrow: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.pageTextSubdued,
                  }}
                >
                  <Text style={{ fontSize: 16, textAlign: 'center' }}>
                    <Trans>
                      No data available for this month.
                      {mode === 'budgeted' &&
                        ' Try budgeting categories or selecting a different month.'}
                      {mode === 'spent' &&
                        ' Try adding transactions or selecting a different month.'}
                      {mode === 'difference' &&
                        ' Try budgeting or adding transactions, or selecting a different month.'}
                    </Trans>
                  </Text>
                </View>
              )}

              <View style={{ marginTop: 30 }}>
                <Trans>
                  <Paragraph>
                    <strong>What is a Sankey plot?</strong>
                  </Paragraph>
                  <Paragraph>
                    A Sankey plot visualizes the flow of quantities between
                    multiple categories, emphasizing the distribution and
                    proportional relationships of data streams.
                  </Paragraph>
                  <Paragraph>
                    <strong>View options:</strong>
                  </Paragraph>
                  <ul style={{ marginTop: 0, paddingLeft: 20 }}>
                    <li style={{ marginBottom: 5 }}>
                      <strong>Budgeted:</strong> Shows how income flows into
                      your budget and is allocated across categories.
                    </li>
                    <li style={{ marginBottom: 5 }}>
                      <strong>Spent:</strong> Displays actual spending by
                      category from transactions.
                    </li>
                    <li>
                      <strong>Difference:</strong> Highlights budget vs. actual
                      variance, showing overspent categories in red and unspent
                      amounts.
                    </li>
                  </ul>
                </Trans>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}
