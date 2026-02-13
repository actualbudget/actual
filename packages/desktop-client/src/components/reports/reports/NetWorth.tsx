import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgCalendar, SvgChart } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Paragraph } from '@actual-app/components/paragraph';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type { NetWorthWidget, TimeFrame } from 'loot-core/types/models';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { FinancialText } from '@desktop-client/components/FinancialText';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { Change } from '@desktop-client/components/reports/Change';
import { NetWorthGraph } from '@desktop-client/components/reports/graphs/NetWorthGraph';
import { Header } from '@desktop-client/components/reports/Header';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportOptions } from '@desktop-client/components/reports/ReportOptions';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createSpreadsheet as netWorthSpreadsheet } from '@desktop-client/components/reports/spreadsheets/net-worth-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function NetWorth() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<NetWorthWidget>(
    params.id ?? '',
    'net-worth-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <NetWorthInner widget={widget} />;
}

type NetWorthInnerProps = {
  widget?: NetWorthWidget;
};

function NetWorthInner({ widget }: NetWorthInnerProps) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const format = useFormat();

  const getDefaultIntervalForMode = useCallback(
    (mode: TimeFrame['mode']): 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' => {
      if (mode === 'lastMonth') {
        return 'Weekly'; // For a single month, weekly interval provides better granularity than a single monthly data point
      }
      return 'Monthly';
    },
    [],
  );

  const accounts = useAccounts();
  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useRuleConditionFilters(
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
    widget?.meta?.interval || getDefaultIntervalForMode(mode),
  );
  const [graphMode, setGraphMode] = useState<'trend' | 'stacked'>(
    widget?.meta?.mode || 'trend',
  );
  // Combined setter: set mode and update interval (unless interval was set in widget meta)
  const setModeAndInterval = useCallback(
    (newMode: TimeFrame['mode']) => {
      setMode(newMode);
      if (!widget?.meta?.interval) {
        setInterval(getDefaultIntervalForMode(newMode));
      }
    },
    [widget?.meta?.interval, getDefaultIntervalForMode],
  );

  const [latestTransaction, setLatestTransaction] = useState('');

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const reportParams = useMemo(
    () =>
      netWorthSpreadsheet(
        start,
        end,
        accounts,
        conditions,
        conditionsOp,
        locale,
        interval,
        firstDayOfWeekIdx,
        format,
      ),
    [
      start,
      end,
      accounts,
      conditions,
      conditionsOp,
      locale,
      interval,
      firstDayOfWeekIdx,
      format,
    ],
  );
  const data = useReport('net_worth', reportParams);
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
    run();
  }, [locale]);

  useEffect(() => {
    if (latestTransaction) {
      const [initialStart, initialEnd, initialMode] = calculateTimeRange(
        widget?.meta?.timeFrame,
        undefined,
        latestTransaction,
      );
      setStart(initialStart);
      setEnd(initialEnd);
      setModeAndInterval(initialMode);
    }
  }, [latestTransaction, widget?.meta?.timeFrame, setModeAndInterval]);

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    setStart(start);
    setEnd(end);
    setModeAndInterval(mode);
  }

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
        interval,
        mode: graphMode,
        timeFrame: {
          start,
          end,
          mode,
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

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const title = widget?.meta?.name || t('Net Worth');
  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Net Worth');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
      },
    });
  };

  const [earliestTransaction, setEarliestTransaction] = useState('');

  if (!allMonths || !data) {
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
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        mode={mode}
        onChangeDates={onChangeDates}
        filters={conditions}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
        inlineContent={
          <>
            <IntervalSelector interval={interval} onChange={setInterval} />
            <ModeSelector mode={graphMode} onChange={setGraphMode} />
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
          overflowY: 'auto',
        }}
      >
        <View
          style={{
            textAlign: 'right',
            paddingTop: 20,
          }}
        >
          <View
            style={{ ...styles.largeText, fontWeight: 400, marginBottom: 5 }}
          >
            <PrivacyFilter>
              <FinancialText>
                {format(data.netWorth, 'financial')}
              </FinancialText>
            </PrivacyFilter>
          </View>
          <PrivacyFilter>
            <Change amount={data.totalChange} />
          </PrivacyFilter>
        </View>

        <NetWorthGraph
          graphData={data.graphData}
          accounts={data.accounts}
          showTooltip={!isNarrowWidth}
          interval={interval}
          mode={graphMode}
        />

        <View style={{ marginTop: 30, userSelect: 'none' }}>
          <Paragraph>
            <strong>
              <Trans>How is net worth calculated?</Trans>
            </strong>
          </Paragraph>
          <Paragraph>
            <Trans>
              Net worth shows the balance of all accounts over time, including
              all of your investments. Your "net worth" is considered to be the
              amount you'd have if you sold all your assets and paid off as much
              debt as possible. If you hover over the graph, you can also see
              the amount of assets and debt individually.
            </Trans>
          </Paragraph>
        </View>
      </View>
    </Page>
  );
}

// Interval selector component with icon-only trigger similar to filter button
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

function ModeSelector({
  mode,
  onChange,
}: {
  mode: 'trend' | 'stacked';
  onChange: (val: 'trend' | 'stacked') => void;
}) {
  const { t } = useTranslation();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { key: 'trend', description: t('Trend') },
    { key: 'stacked', description: t('Stacked') },
  ];

  const currentLabel =
    options.find(opt => opt.key === mode)?.description ?? mode;

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        aria-label={t('Change mode')}
      >
        <SvgChart style={{ width: 12, height: 12 }} />
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
            onChange(item as 'trend' | 'stacked');
            setIsOpen(false);
          }}
          items={options.map(({ key, description }) => ({
            name: key,
            text: description,
          }))}
        />
      </Popover>
    </>
  );
}
