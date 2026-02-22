import React, { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgEquals } from '@actual-app/components/icons/v1';
import {
  SvgCloseParenthesis,
  SvgOpenParenthesis,
  SvgSum,
} from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { parseISO } from 'date-fns';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type {
  SummaryContent,
  SummaryWidget,
  TimeFrame,
} from 'loot-core/types/models';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { AppliedFilters } from '@desktop-client/components/filters/AppliedFilters';
import { FilterButton } from '@desktop-client/components/filters/FiltersMenu';
import { FinancialText } from '@desktop-client/components/FinancialText';
import { Checkbox } from '@desktop-client/components/forms';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { Header } from '@desktop-client/components/reports/Header';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { summarySpreadsheet } from '@desktop-client/components/reports/spreadsheets/summary-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { FieldSelect } from '@desktop-client/components/rules/RuleEditor';
import { useDashboardWidget } from '@desktop-client/hooks/useDashboardWidget';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { useUpdateDashboardWidgetMutation } from '@desktop-client/reports/mutations';

export function Summary() {
  const params = useParams();
  const { data: widget, isPending } = useDashboardWidget<SummaryWidget>({
    id: params.id,
    type: 'summary-card',
  });

  if (isPending) {
    return <LoadingIndicator />;
  }

  return <SummaryInner widget={widget} />;
}

type SummaryInnerProps = {
  widget?: SummaryWidget;
};

type FilterObject = ReturnType<typeof useRuleConditionFilters>;

function SummaryInner({ widget }: SummaryInnerProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const format = useFormat();

  const [start, setStart] = useState(
    monthUtils.dayFromDate(monthUtils.currentMonth()),
  );
  const [end, setEnd] = useState(monthUtils.currentDay());
  const [mode, setMode] = useState<TimeFrame['mode']>('full');

  const dividendFilters: FilterObject = useRuleConditionFilters(
    widget?.meta?.conditions ?? [],
    widget?.meta?.conditionsOp ?? 'and',
  );

  const [content, setContent] = useState<SummaryContent>(
    widget?.meta?.content
      ? (() => {
          try {
            return JSON.parse(widget.meta.content);
          } catch (error) {
            console.error('Failed to parse widget meta content:', error);
            return {
              type: 'sum',
              divisorAllTimeDateRange: false,
              divisorConditions: [],
              divisorConditionsOp: 'and',
            };
          }
        })()
      : {
          type: 'sum',
          divisorAllTimeDateRange: false,
          divisorConditions: [],
          divisorConditionsOp: 'and',
        },
  );

  const divisorFilters = useRuleConditionFilters(
    content.type === 'percentage' ? (content?.divisorConditions ?? []) : [],
    content.type === 'percentage'
      ? (content?.divisorConditionsOp ?? 'and')
      : 'and',
  );

  const params = useMemo(
    () =>
      summarySpreadsheet(
        start,
        end,
        dividendFilters.conditions,
        dividendFilters.conditionsOp,
        content,
        locale,
      ),
    [
      start,
      end,
      dividendFilters.conditions,
      dividendFilters.conditionsOp,
      content,
      locale,
    ],
  );

  const data = useReport('summary', params);

  useEffect(() => {
    setContent(prev => ({
      ...prev,
      divisorConditions: divisorFilters.conditions,
      divisorConditionsOp: divisorFilters.conditionsOp,
    }));
  }, [divisorFilters.conditions, divisorFilters.conditionsOp]);

  const [allMonths, setAllMonths] = useState<
    Array<{
      name: string;
      pretty: string;
    }>
  >([]);

  const [earliestTransaction, setEarliestTransaction] = useState('');
  const [latestTransaction, setLatestTransaction] = useState('');
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

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
            parseISO(fromDateRepr(earliestTransaction.date)),
          )
        : currentMonth;
      const latestTransactionMonth = latestTransaction
        ? monthUtils.monthFromDate(
            parseISO(fromDateRepr(latestTransaction.date)),
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

  useEffect(() => {
    if (latestTransaction) {
      const [initialStart, initialEnd, initialMode] = calculateTimeRange(
        widget?.meta?.timeFrame,
        {
          start: monthUtils.dayFromDate(monthUtils.currentMonth()),
          end: monthUtils.currentDay(),
          mode: 'full',
        },
        latestTransaction,
      );
      setStart(initialStart);
      setEnd(initialEnd);
      setMode(initialMode);
    }
  }, [latestTransaction, widget?.meta?.timeFrame]);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const title = widget?.meta?.name || t('Summary');

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Cannot save: No widget available.'),
          },
        }),
      );
      return;
    }

    const name = newName || t('Summary');
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          name,
          content: JSON.stringify(content),
        },
      },
    });
  };

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
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
            message: t('Cannot save: No widget available.'),
          },
        }),
      );
      return;
    }

    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            conditions: dividendFilters.conditions,
            conditionsOp: dividendFilters.conditionsOp,
            timeFrame: {
              start,
              end,
              mode,
            },
            content: JSON.stringify(content),
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

  const getDivisorFormatted = (contentType: string, value: number) => {
    if (contentType === 'avgPerMonth') {
      return format(value, 'number');
    } else if (contentType === 'avgPerYear') {
      return format(value, 'number');
    } else if (contentType === 'avgPerTransact') {
      return format(value, 'number');
    }
    return format(Math.round(value), 'financial');
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
        allMonths={allMonths}
        start={start}
        end={end}
        earliestTransaction={earliestTransaction}
        latestTransaction={latestTransaction}
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        mode={mode}
        onChangeDates={onChangeDates}
        show1Month
      >
        {widget && (
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        )}
      </Header>
      <View
        style={{
          width: '100%',
          background: theme.pageBackground,
        }}
      >
        <View
          style={{
            width: '100%',
            alignContent: 'center',
            justifyContent: 'flex-start',
            alignItems: 'center',
            flexDirection: 'row',
            padding: 16,
          }}
        >
          <span style={{ marginRight: 4 }}>
            <Trans>Show as</Trans>
          </span>
          <FieldSelect
            style={{ marginRight: 16 }}
            fields={[
              ['sum', t('Sum')],
              ['avgPerMonth', t('Average per month')],
              ['avgPerYear', t('Average per year')],
              ['avgPerTransact', t('Average per transaction')],
              ['percentage', t('Percentage')],
            ]}
            value={content.type ?? 'sum'}
            onChange={(
              newValue:
                | 'sum'
                | 'avgPerMonth'
                | 'avgPerYear'
                | 'avgPerTransact'
                | 'percentage',
            ) =>
              setContent(
                (prev: SummaryContent) =>
                  ({
                    ...prev,
                    type: newValue,
                  }) as SummaryContent,
              )
            }
          />
        </View>
        {content.type === 'percentage' && (
          <View style={{ flexDirection: 'row', marginLeft: 16 }}>
            <Checkbox
              id="enabled-field"
              checked={content.divisorAllTimeDateRange ?? false}
              onChange={() => {
                const currentValue = content.divisorAllTimeDateRange ?? false;
                setContent(prev => ({
                  ...prev,
                  divisorAllTimeDateRange: !currentValue,
                }));
              }}
            />{' '}
            <Trans>All time divisor</Trans>
          </View>
        )}
      </View>
      <View
        style={{
          background: theme.pageBackground,
          padding: 20,
          paddingTop: 0,
          flexGrow: 1,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <Operator
            type={content.type}
            dividendFilterObject={dividendFilters}
            divisorFilterObject={divisorFilters}
            showDivisorDateRange={
              content.type === 'percentage'
                ? !(content.divisorAllTimeDateRange ?? false)
                : false
            }
            fromRange={data?.fromRange ?? ''}
            toRange={data?.toRange ?? ''}
          />
          {content.type !== 'sum' && (
            <>
              <SvgEquals width={50} style={{ marginLeft: 56 }} />
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: '50px',
                    width: '100%',
                    textAlign: 'center',
                  }}
                >
                  <PrivacyFilter>
                    <FinancialText>
                      {format(data?.dividend ?? 0, 'financial')}
                    </FinancialText>
                  </PrivacyFilter>
                </Text>
                <div
                  style={{
                    width: '100%',
                    marginTop: 32,
                    marginBottom: 32,
                    borderTop: '2px solid',
                    borderBottom: '2px solid',
                  }}
                />
                <Text
                  style={{
                    fontSize: '50px',
                    width: '100%',
                    textAlign: 'center',
                  }}
                >
                  <PrivacyFilter>
                    {getDivisorFormatted(content.type, data?.divisor ?? 0)}
                  </PrivacyFilter>
                </Text>
              </View>
            </>
          )}
          <SvgEquals width={50} style={{ marginLeft: 16 }} />
          <View
            style={{
              flexGrow: 1,
              textAlign: 'center',
              width: '250px',
              maxWidth: '250px',
              justifyItems: 'center',
              alignItems: 'center',
              marginLeft: 16,
              fontSize: '50px',
              justifyContent: 'center',
              color:
                (data?.total ?? 0) === 0
                  ? theme.reportsNumberNeutral
                  : (data?.total ?? 0) < 0
                    ? theme.reportsNumberNegative
                    : theme.reportsNumberPositive,
            }}
          >
            <PrivacyFilter>
              {content.type === 'percentage'
                ? format(Math.abs(data?.total ?? 0), 'number')
                : format(Math.abs(Math.round(data?.total ?? 0)), 'financial')}
              {content.type === 'percentage' ? '%' : ''}
            </PrivacyFilter>
          </View>
        </View>
      </View>
    </Page>
  );
}

type OperatorProps = {
  type: 'sum' | 'avgPerMonth' | 'avgPerYear' | 'avgPerTransact' | 'percentage';
  dividendFilterObject: FilterObject;
  divisorFilterObject: FilterObject;
  fromRange: string;
  toRange: string;
  showDivisorDateRange: boolean;
};
function Operator({
  type,
  dividendFilterObject,
  divisorFilterObject,
  fromRange,
  toRange,
  showDivisorDateRange,
}: OperatorProps) {
  const { t } = useTranslation();

  return (
    <View>
      <SumWithRange
        from={fromRange}
        to={toRange}
        filterObject={dividendFilterObject}
      />
      {type === 'percentage' && (
        <>
          <div
            style={{
              width: '100%',
              marginTop: 32,
              marginBottom: 32,
              borderTop: '2px solid',
              borderBottom: '2px solid',
            }}
          />
          <SumWithRange
            from={!showDivisorDateRange ? '' : fromRange}
            to={!showDivisorDateRange ? '' : toRange}
            filterObject={divisorFilterObject}
          />
        </>
      )}
      {type !== 'percentage' && type !== 'sum' && (
        <>
          <div
            style={{
              width: '100%',
              marginTop: 32,
              marginBottom: 32,
              borderTop: '2px solid',
              borderBottom: '2px solid',
            }}
          />
          <Text
            style={{ fontSize: '32px', width: '100%', textAlign: 'center' }}
          >
            {type === 'avgPerMonth'
              ? t('number of months')
              : type === 'avgPerYear'
                ? t('number of years')
                : t('number of transactions')}
          </Text>
        </>
      )}
    </View>
  );
}

type SumWithRangeProps = {
  from: string;
  to: string;
  containerStyle?: CSSProperties;
  filterObject: FilterObject;
};
function SumWithRange({
  from,
  to,
  containerStyle,
  filterObject,
}: SumWithRangeProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        ...containerStyle,
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '70px 15px 1fr 15px',
      }}
    >
      <View style={{ position: 'relative', height: '50px', marginRight: 50 }}>
        <SvgSum width={50} height={50} />
        <Text style={{ position: 'absolute', right: -30, top: -20 }}>{to}</Text>
        <Text style={{ position: 'absolute', right: -30, bottom: -20 }}>
          {from}
        </Text>
      </View>
      <SvgOpenParenthesis width={15} style={{ height: '100%' }} />
      <View style={{ marginLeft: 16, maxWidth: '220px', marginRight: 16 }}>
        {(filterObject.conditions?.length ?? 0) === 0 ? (
          <Text style={{ fontSize: '25px', color: theme.pageTextPositive }}>
            {t('all transactions')}
          </Text>
        ) : (
          <AppliedFilters
            conditions={filterObject.conditions}
            onUpdate={filterObject.onUpdate}
            onDelete={filterObject.onDelete}
            conditionsOp={filterObject.conditionsOp}
            onConditionsOpChange={filterObject.onConditionsOpChange}
          />
        )}
      </View>
      <SvgCloseParenthesis width={15} style={{ height: '100%' }} />
      <View style={{ position: 'absolute', top: -15, right: -55 }}>
        <FilterButton
          compact={false}
          onApply={filterObject.onApply}
          hover={false}
        />
      </View>
    </View>
  );
}
