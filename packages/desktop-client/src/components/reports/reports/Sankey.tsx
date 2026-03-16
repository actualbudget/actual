import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
import type { SankeyData } from 'recharts/types/chart/Sankey';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type {
  SankeyWidget,
  RuleConditionEntity,
  TimeFrame,
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
import { Header } from '@desktop-client/components/reports/Header';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ModeButton } from '@desktop-client/components/reports/ModeButton';
import { createSpreadsheet as sankeySpreadsheet } from '@desktop-client/components/reports/spreadsheets/sankey-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDashboardWidget } from '@desktop-client/hooks/useDashboardWidget';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { useUpdateDashboardWidgetMutation } from '@desktop-client/reports/mutations';

export function Sankey() {
  const params = useParams();
  const { data: widget, isLoading } = useDashboardWidget<SankeyWidget>({
    id: params.id ?? '',
    type: 'sankey-card',
  });

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <SankeyInner widget={widget} />;
}

type GraphMode = 'budgeted' | 'spent';

type GraphModeSelectorProps = {
  mode: GraphMode;
  onChange: (mode: GraphMode) => void;
};

function GraphModeSelector({ mode, onChange }: GraphModeSelectorProps) {
  return (
    <SpaceBetween gap={5}>
      <ModeButton
        selected={mode === 'spent'}
        style={{
          backgroundColor: 'inherit',
        }}
        onSelect={() => {
          onChange('spent');
        }}
      >
        <Trans>Spent</Trans>
      </ModeButton>
      <ModeButton
        selected={mode === 'budgeted'}
        onSelect={() => {
          onChange('budgeted');
        }}
        style={{
          backgroundColor: 'inherit',
        }}
      >
        <Trans>Budgeted</Trans>
      </ModeButton>
    </SpaceBetween>
  );
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

  const [start, setStart] = useState(monthUtils.currentMonth());
  const [end, setEnd] = useState(monthUtils.currentMonth());

  const [earliestTransaction, setEarliestTransaction] = useState('');
  const [latestTransaction, setLatestTransaction] = useState('');

  const [graphMode, setGraphMode] = useState<GraphMode>(
    widget?.meta?.mode ?? 'spent',
  );

  const { data: { grouped: groupedCategories = [] } = { grouped: [] } } =
    useCategories();

  const reportParams = useMemo(
    () =>
      sankeySpreadsheet(
        start,
        end,
        groupedCategories,
        conditions,
        conditionsOp,
        graphMode,
      ),
    [start, end, groupedCategories, conditions, conditionsOp, graphMode],
  );
  const data = useReport('sankey', reportParams);

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
      let earliestMonth = earliestTransaction
        ? monthUtils.monthFromDate(
          d.parseISO(fromDateRepr(earliestTransaction.date)),
        )
        : currentMonth;
      const latestTransactionMonth = latestTransaction
        ? monthUtils.monthFromDate(
          d.parseISO(fromDateRepr(latestTransaction.date)),
        )
        : currentMonth;

      const latestMonth =
        latestTransactionMonth > currentMonth
          ? latestTransactionMonth
          : currentMonth;

      // Make sure the month selects are at least populates with a
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
          pretty: monthUtils.format(month, 'MMMM yyyy', locale),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    void run();
  }, [locale]);
  function onChangeDates(start: string, end: string) {
    setStart(start);
    setEnd(end);
  }

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
            mode: graphMode,
            timeFrame: {
              start,
              end,
              mode: 'static',
            },
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
      <Header
        allMonths={allMonths}
        start={start}
        end={end}
        earliestTransaction={earliestTransaction}
        latestTransaction={latestTransaction}
        onChangeDates={onChangeDates}
        filters={conditions}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
        inlineContent={
          <>
            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
                marginLeft: 10,
              }}
            />
            <GraphModeSelector mode={graphMode} onChange={setGraphMode} />
            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
                marginLeft: 10,
              }}
            />
          </>
        }
      >
        {widget && (
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        )}
      </Header>
      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 20,
          paddingTop: 0,
          flex: '1 0 auto',
          overflowY: 'visible',
        }}
      >
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
                      {graphMode === 'budgeted' && (
                        <Trans>
                          No data available for this month. Try budgeting
                          categories or selecting a different month.
                        </Trans>
                      )}
                      {graphMode === 'spent' && (
                        <Trans>
                          No data available for this month. Try adding
                          transactions or selecting a different month.
                        </Trans>
                      )}
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
                        <strong>Spent:</strong> Displays actual spending by
                        category from transactions.
                      </li>
                      <li style={{ marginBottom: 5 }}>
                        <strong>Budgeted:</strong> Shows how income flows into
                        your budget and is allocated across categories.
                      </li>
                    </ul>
                  </Trans>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}
