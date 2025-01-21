import React, { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { parseISO } from 'date-fns';

import { useWidget } from 'loot-core/client/data-hooks/widget';
import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import { send } from 'loot-core/platform/client/fetch';
import { amountToCurrency } from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  type SummaryContent,
  type SummaryWidget,
  type TimeFrame,
} from 'loot-core/types/models';

import { useFilters } from '../../../hooks/useFilters';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { SvgEquals } from '../../../icons/v1';
import { SvgCloseParenthesis } from '../../../icons/v2/CloseParenthesis';
import { SvgOpenParenthesis } from '../../../icons/v2/OpenParenthesis';
import { SvgSum } from '../../../icons/v2/Sum';
import { useDispatch } from '../../../redux';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { EditablePageHeaderTitle } from '../../EditablePageHeaderTitle';
import { AppliedFilters } from '../../filters/AppliedFilters';
import { FilterButton } from '../../filters/FiltersMenu';
import { Checkbox } from '../../forms';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { FieldSelect } from '../../modals/EditRuleModal';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { chartTheme } from '../chart-theme';
import { Header } from '../Header';
import { LoadingIndicator } from '../LoadingIndicator';
import { calculateTimeRange } from '../reportRanges';
import { summarySpreadsheet } from '../spreadsheets/summary-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

export function Summary() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<SummaryWidget>(
    params.id ?? '',
    'summary-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <SummaryInner widget={widget} />;
}

type SummaryInnerProps = {
  widget?: SummaryWidget;
};

type FilterObject = ReturnType<typeof useFilters>;

function SummaryInner({ widget }: SummaryInnerProps) {
  const { t } = useTranslation();
  const [initialStart, initialEnd, initialMode] = calculateTimeRange(
    widget?.meta?.timeFrame,
    {
      start: monthUtils.dayFromDate(monthUtils.currentMonth()),
      end: monthUtils.currentDay(),
      mode: 'full',
    },
  );
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [mode, setMode] = useState(initialMode);

  const dividendFilters: FilterObject = useFilters(
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

  const divisorFilters = useFilters(
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
      ),
    [
      start,
      end,
      dividendFilters.conditions,
      dividendFilters.conditionsOp,
      content,
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

  const [earliestTransaction, _] = useState('');
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = trans
        ? monthUtils.monthFromDate(parseISO(fromDateRepr(trans.date)))
        : currentMonth;

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

      setAllMonths(allMonths);
    }
    run();
  }, []);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const title = widget?.meta?.name || t('Summary');

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
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
        content: JSON.stringify(content),
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
    await send('dashboard-update-widget', {
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
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        mode={mode}
        onChangeDates={onChangeDates}
        onApply={dividendFilters.onApply}
        onUpdateFilter={dividendFilters.onUpdate}
        onDeleteFilter={dividendFilters.onDelete}
        conditionsOp={dividendFilters.conditionsOp}
        onConditionsOpChange={dividendFilters.onConditionsOpChange}
        show1Month={true}
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
          <span style={{ marginRight: 4 }}>{t('Show as')}</span>
          <FieldSelect
            style={{ marginRight: 16 }}
            fields={[
              ['sum', t('Sum')],
              ['avgPerMonth', t('Average per month')],
              ['avgPerTransact', t('Average per transaction')],
              ['percentage', t('Percentage')],
            ]}
            value={content.type ?? 'sum'}
            onChange={(
              newValue: 'sum' | 'avgPerMonth' | 'avgPerTransact' | 'percentage',
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
            {t('All time divisor')}
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
                    {amountToCurrency(data?.dividend ?? 0)}
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
                    {amountToCurrency(data?.divisor ?? 0)}
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
                (data?.total ?? 0) < 0
                  ? chartTheme.colors.red
                  : chartTheme.colors.blue,
            }}
          >
            <PrivacyFilter>
              {amountToCurrency(Math.abs(data?.total ?? 0))}
              {content.type === 'percentage' ? '%' : ''}
            </PrivacyFilter>
          </View>
        </View>
      </View>
    </Page>
  );
}

type OperatorProps = {
  type: 'sum' | 'avgPerMonth' | 'avgPerTransact' | 'percentage';
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
          exclude={undefined}
        />
      </View>
    </View>
  );
}
