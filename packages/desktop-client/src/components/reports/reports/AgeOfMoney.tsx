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
import { SvgCalendar } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Paragraph } from '@actual-app/components/paragraph';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type AgeOfMoneyGranularity,
  type AgeOfMoneyWidget,
  type TimeFrame,
} from 'loot-core/types/models';

import { getAgeColor } from './AgeOfMoneyCard';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { AgeOfMoneyGraph } from '@desktop-client/components/reports/graphs/AgeOfMoneyGraph';
import { Header } from '@desktop-client/components/reports/Header';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createAgeOfMoneySpreadsheet } from '@desktop-client/components/reports/spreadsheets/age-of-money-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function AgeOfMoney() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<AgeOfMoneyWidget>(
    params.id ?? '',
    'age-of-money-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <AgeOfMoneyInner widget={widget} />;
}

type AgeOfMoneyInnerProps = {
  widget?: AgeOfMoneyWidget;
};

function AgeOfMoneyInner({ widget }: AgeOfMoneyInnerProps) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const { t } = useTranslation();

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
  const [granularity, setGranularity] = useState<AgeOfMoneyGranularity>(
    widget?.meta?.granularity ?? 'monthly',
  );

  const [latestTransaction, setLatestTransaction] = useState('');
  const [earliestTransaction, setEarliestTransaction] = useState('');

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const reportParams = useMemo(
    () =>
      createAgeOfMoneySpreadsheet({
        start,
        end,
        conditions,
        conditionsOp,
        granularity,
      }),
    [start, end, conditions, conditionsOp, granularity],
  );
  const data = useReport('age_of_money', reportParams);

  useEffect(() => {
    async function run() {
      const earliestTrans = await send('get-earliest-transaction');
      setEarliestTransaction(
        earliestTrans ? earliestTrans.date : monthUtils.currentDay(),
      );

      const latestTrans = await send('get-latest-transaction');
      setLatestTransaction(
        latestTrans ? latestTrans.date : monthUtils.currentDay(),
      );

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

      const months = monthUtils
        .rangeInclusive(earliestMonth, latestMonth)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy', locale),
        }))
        .reverse();

      setAllMonths(months);
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
      setMode(initialMode);
    }
  }, [latestTransaction, widget?.meta?.timeFrame]);

  const onChangeDates = useCallback(
    (newStart: string, newEnd: string, newMode: TimeFrame['mode']) => {
      setStart(newStart);
      setEnd(newEnd);
      setMode(newMode);
    },
    [],
  );

  const onSaveWidget = useCallback(async () => {
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
          start,
          end,
          mode,
        },
        granularity,
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
  }, [
    widget,
    conditions,
    conditionsOp,
    start,
    end,
    mode,
    granularity,
    dispatch,
    t,
  ]);

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const title = widget?.meta?.name || t('Age of Money');
  const onSaveWidgetName = useCallback(
    async (newName: string) => {
      if (!widget) {
        throw new Error('No widget that could be saved.');
      }

      const name = newName || t('Age of Money');
      await send('dashboard-update-widget', {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          name,
        },
      });
    },
    [widget, t],
  );

  if (!allMonths || !data) {
    return <LoadingIndicator />;
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
          <GranularitySelector
            granularity={granularity}
            onChange={setGranularity}
          />
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
            style={{
              ...styles.largeText,
              fontWeight: 400,
              marginBottom: 5,
              color: getAgeColor(data.currentAge),
            }}
          >
            <PrivacyFilter>
              {data.currentAge !== null
                ? t('{{days}} days', { days: data.currentAge })
                : t('N/A')}
            </PrivacyFilter>
          </View>
          <View style={{ color: theme.pageTextSubdued }}>
            {data.trend === 'up'
              ? t('↑ Improving')
              : data.trend === 'down'
                ? t('↓ Declining')
                : t('→ Stable')}
          </View>
          {data.insufficientData && (
            <View
              style={{ color: theme.warningText, fontSize: 12, marginTop: 5 }}
            >
              {t(
                'Note: Some expenses could not be matched to income (spending exceeded income in this period)',
              )}
            </View>
          )}
        </View>

        <AgeOfMoneyGraph data={data.graphData} />

        <View style={{ marginTop: 30, userSelect: 'none' }}>
          <Paragraph>
            <strong>
              <Trans>What is Age of Money?</Trans>
            </strong>
          </Paragraph>
          <Paragraph>
            <Trans>
              Age of Money shows how many days, on average, your money sits in
              your budget before you spend it. It measures the gap between when
              you earn money and when you spend it.
            </Trans>
          </Paragraph>
          <Paragraph>
            <Trans>
              A higher Age of Money means you're spending older money, which
              indicates you're living on last month's income rather than
              paycheck-to-paycheck. An age of 30 days or more is considered
              ideal—it means you're typically spending money you earned a month
              ago.
            </Trans>
          </Paragraph>
          <Paragraph>
            <strong>
              <Trans>How is it calculated?</Trans>
            </strong>
          </Paragraph>
          <Paragraph>
            <Trans>
              The calculation uses the FIFO (First In, First Out) method: when
              you spend money, it's considered to come from your oldest income
              first. The age is the difference in days between when you received
              that income and when you spent it. The displayed value is the
              average age of your last 10 expenses.
            </Trans>
          </Paragraph>
        </View>
      </View>
    </Page>
  );
}

function GranularitySelector({
  granularity,
  onChange,
}: {
  granularity: AgeOfMoneyGranularity;
  onChange: (val: AgeOfMoneyGranularity) => void;
}) {
  const { t } = useTranslation();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const options: Array<{ key: AgeOfMoneyGranularity; description: string }> = [
    { key: 'daily', description: t('Daily') },
    { key: 'weekly', description: t('Weekly') },
    { key: 'monthly', description: t('Monthly') },
  ];

  const currentLabel =
    options.find(opt => opt.key === granularity)?.description ?? granularity;

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        aria-label={t('Change granularity')}
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
            onChange(item as AgeOfMoneyGranularity);
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
