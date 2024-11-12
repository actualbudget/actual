import React, { useState, useEffect, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { parseISO } from 'date-fns';

import { useWidget } from 'loot-core/client/data-hooks/widget';
import { send } from 'loot-core/platform/client/fetch';
import { addNotification } from 'loot-core/src/client/actions';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  type SummaryContent,
  type SummaryWidget,
  type TimeFrame,
} from 'loot-core/types/models';

import { useFilters } from '../../../hooks/useFilters';
import { useNavigate } from '../../../hooks/useNavigate';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button2';
import { View } from '../../common/View';
import { EditablePageHeaderTitle } from '../../EditablePageHeaderTitle';
import { AppliedFilters } from '../../filters/AppliedFilters';
import { FilterButton } from '../../filters/FiltersMenu';
import { Checkbox } from '../../forms';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { FieldSelect } from '../../modals/EditRuleModal';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { Header } from '../Header';
import { LoadingIndicator } from '../LoadingIndicator';
import { calculateTimeRange } from '../reportRanges';
import { summarySpreadsheet } from '../spreadsheets/summary-spreadsheet';
import { SummaryNumber } from '../SummaryNumber';
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

  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters(
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
              divisorIncludeDateRange: true,
              divisorConditions: [],
              divisorConditionsOp: 'and',
            };
          }
        })()
      : {
          type: 'sum',
          divisorIncludeDateRange: true,
          divisorConditions: [],
          divisorConditionsOp: 'and',
        },
  );

  const {
    conditions: divisorConditions,
    conditionsOp: divisorConditionsOp,
    onApply: divisorOnApplyFilter,
    onDelete: divisorOnDeleteFilter,
    onUpdate: divisorOnUpdateFilter,
    onConditionsOpChange: divisorOnConditionsOpChange,
  } = useFilters(
    content.type === 'percentage' ? (content?.divisorConditions ?? []) : [],
    content.type === 'percentage'
      ? (content?.divisorConditionsOp ?? 'and')
      : 'and',
  );

  const params = useMemo(
    () => summarySpreadsheet(start, end, conditions, conditionsOp, content),
    [start, end, conditions, conditionsOp, content],
  );

  const data = useReport('summary', params);

  useEffect(() => {
    setContent(prev => ({ ...prev, divisorConditions, divisorConditionsOp }));
  }, [divisorConditions, divisorConditionsOp]);

  const [allMonths, setAllMonths] = useState<
    Array<{
      name: string;
      pretty: string;
    }>
  >([]);

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
          type: 'error',
          message: t('Cannot save: No widget available.'),
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
          type: 'error',
          message: t('Cannot save: No widget available.'),
        }),
      );
      return;
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
        content: JSON.stringify(content),
      },
    });
    dispatch(
      addNotification({
        type: 'message',
        message: t('Dashboard widget successfully saved.'),
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
        mode={mode}
        onChangeDates={onChangeDates}
        filters={conditions}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
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
          backgroundColor: theme.pageBackground,
          padding: 20,
          paddingTop: 0,
          flexGrow: 1,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
          }}
        >
          <View
            style={{
              flexGrow: 1,
              textAlign: 'center',
              maxWidth: '400px',
              marginTop: -20,
              justifyItems: 'center',
              alignItems: 'center',
            }}
          >
            <SummaryNumber
              animate={false}
              value={data === undefined ? null : data?.total ?? 0}
              suffix={content.type === 'percentage' ? '%' : ''}
              loading={data === undefined}
            />
          </View>
        </View>
      </View>
      <View
        style={{
          width: '100%',
          background: theme.tableBackground,
          height: '250px',
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
          <span style={{ marginRight: 4 }}>Mode</span>
          <FieldSelect
            style={{ marginRight: 16 }}
            fields={[
              ['sum', 'Sum'],
              ['avgPerMonth', 'Average per month'],
              ['avgPerTransact', 'Average per transaction'],
              ['percentage', 'Percentage'],
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
          <View
            style={{
              margin: 16,
              marginTop: 0,
            }}
          >
            <span
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
              }}
            >
              Divisor Filter
            </span>
            <View
              style={{
                border: '1px solid',
                borderColor: theme.tableBorder,
                flexGrow: 1,
                padding: 8,
              }}
            >
              <View style={{ width: '100px' }}>
                <FilterButton
                  compact={isNarrowWidth}
                  onApply={divisorOnApplyFilter}
                  hover={false}
                  exclude={undefined}
                />
              </View>
              {divisorConditions && divisorConditions.length > 0 && (
                <View style={{ marginTop: 5 }}>
                  <AppliedFilters
                    conditions={divisorConditions}
                    onUpdate={divisorOnUpdateFilter}
                    onDelete={divisorOnDeleteFilter}
                    conditionsOp={divisorConditionsOp}
                    onConditionsOpChange={divisorOnConditionsOpChange}
                  />
                </View>
              )}
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <Checkbox
                  id="enabled-field"
                  checked={content.divisorIncludeDateRange ?? true}
                  onChange={() => {
                    const currentValue =
                      content.divisorIncludeDateRange ?? true;
                    setContent(prev => ({
                      ...prev,
                      divisorIncludeDateRange: !currentValue,
                    }));
                  }}
                />{' '}
                Include summary date range
              </View>
            </View>
          </View>
        )}
      </View>
    </Page>
  );
}
