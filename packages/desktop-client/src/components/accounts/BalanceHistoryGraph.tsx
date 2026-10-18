import React, { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { integerToCurrency } from '@actual-app/core/shared/util';
import { eachMonthOfInterval, format, subMonths } from 'date-fns';
import { Area, AreaChart, Tooltip as RechartsTooltip, YAxis } from 'recharts';

import type { CurrencyDisplayMode } from '#components/currency/displayMode';
import { PrivacyFilter } from '#components/PrivacyFilter';
import {
  getColorScale,
  useRechartsAnimation,
} from '#components/reports/chart-theme';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { useAccount } from '#hooks/useAccount';
import { useAccountBalanceConverter } from '#hooks/useAccountBalanceConverter';
import { useCurrencyFormatter } from '#hooks/useCurrencyFormatter';
import { useLocale } from '#hooks/useLocale';
import * as query from '#queries';
import { liveQuery } from '#queries/liveQuery';

import { buildBalanceHistory } from './balanceHistory';
import type { AccountAmount, AccountMonthAmount } from './balanceHistory';

const LABEL_WIDTH = 70;
// Amounts in another currency carry its code, e.g. USD$1,234.56
const WIDE_LABEL_WIDTH = 100;

type ChartPoint = {
  date: string;
  balance: number;
  converted: number;
  isApproximate: boolean;
};

type BalanceHistoryGraphProps = {
  accountId?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
};

export function BalanceHistoryGraph({
  accountId,
  style,
  ref,
}: BalanceHistoryGraphProps) {
  const locale = useLocale();
  const animationProps = useRechartsAnimation({ isAnimationActive: false });
  const account = useAccount(accountId ?? '');
  const {
    defaultCurrencyCode,
    getAccountCurrency,
    getDisplayMode,
    isForeignCurrency,
    formatAmount,
  } = useCurrencyFormatter();
  // Undefined when no account uses another currency; null while the rates
  // are still loading
  const convertBalance = useAccountBalanceConverter();
  const currency = account ? getAccountCurrency(account) : null;
  const isForeignAccount = currency !== null && isForeignCurrency(currency);

  // A foreign account follows its display mode; graphs that add up several
  // accounts in different currencies show converted balances
  const mode: CurrencyDisplayMode =
    convertBalance === undefined
      ? 'original'
      : account && isForeignAccount
        ? getDisplayMode(account.id)
        : 'converted';
  // Converting needs each account's balance on its own
  const groupByAccount = convertBalance !== undefined;

  const [startingBalances, setStartingBalances] = useState<
    AccountAmount[] | null
  >(null);
  const [monthlyAmounts, setMonthlyAmounts] = useState<
    AccountMonthAmount[] | null
  >(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  // The months shown and today's date, fixed when the queries start
  const [range, setRange] = useState<{
    months: string[];
    today: string;
  } | null>(null);

  useEffect(() => {
    // Reset state when the account changes
    setStartingBalances(null);
    setMonthlyAmounts(null);
    setHoveredPoint(null);
    setHasFailed(false);

    const endDate = new Date();
    const startDate = subMonths(endDate, 12);
    setRange({
      months: eachMonthOfInterval({ start: startDate, end: endDate }).map(
        month => format(month, 'yyyy-MM'),
      ),
      today: monthUtils.currentDay(),
    });

    const before = query.transactions(accountId).filter({
      date: { $lt: monthUtils.firstDayOfMonth(startDate) },
    });
    const during = query.transactions(accountId).filter({
      $and: [
        { date: { $gte: monthUtils.firstDayOfMonth(startDate) } },
        { date: { $lte: monthUtils.lastDayOfMonth(endDate) } },
      ],
    });

    const onError = (error: Error) => {
      console.error('Error fetching the balance history:', error);
      setHasFailed(true);
    };

    const startingBalancesLive = groupByAccount
      ? liveQuery<AccountAmount>(
          before
            .groupBy('account')
            .select(['account', { amount: { $sum: '$amount' } }]),
          { onData: setStartingBalances, onError },
        )
      : liveQuery<number>(before.calculate({ $sum: '$amount' }), {
          onData: data =>
            setStartingBalances([{ account: '', amount: data[0] || 0 }]),
          onError,
        });

    const monthlyAmountsLive = liveQuery<{
      account?: string;
      date: string;
      amount: number;
    }>(
      (groupByAccount
        ? during.groupBy(['account', { $month: '$date' }])
        : during.groupBy({ $month: '$date' })
      ).select([
        ...(groupByAccount ? ['account'] : []),
        { date: { $month: '$date' } },
        { amount: { $sum: '$amount' } },
      ]),
      {
        onData: data =>
          setMonthlyAmounts(
            data.map(row => ({
              account: row.account ?? '',
              month: row.date,
              amount: row.amount,
            })),
          ),
        onError,
      },
    );

    return () => {
      startingBalancesLive.unsubscribe();
      monthlyAmountsLive.unsubscribe();
    };
  }, [accountId, groupByAccount]);

  const data = useMemo((): ChartPoint[] | null => {
    if (hasFailed) {
      return [];
    }
    if (
      range === null ||
      startingBalances === null ||
      monthlyAmounts === null ||
      convertBalance === null
    ) {
      return null;
    }

    return buildBalanceHistory({
      months: range.months,
      today: range.today,
      startingBalances,
      monthlyAmounts,
      convertBalance,
    }).map(point => ({
      date: monthUtils.format(point.month, 'MMM yyyy', locale),
      balance: point.balance,
      converted: point.converted,
      isApproximate: point.isApproximate,
    }));
  }, [
    hasFailed,
    range,
    startingBalances,
    monthlyAmounts,
    convertBalance,
    locale,
  ]);

  // 'both' follows the account's own currency for the trend
  const trendKey = mode === 'converted' ? 'converted' : 'balance';
  const percentageChange = useMemo(() => {
    if (!data || data.length < 2) return 0;
    const firstBalance = data[0][trendKey];
    const lastBalance = data[data.length - 1][trendKey];
    if (firstBalance === 0) return 0;
    return ((lastBalance - firstBalance) / Math.abs(firstBalance)) * 100;
  }, [data, trendKey]);
  const color = percentageChange >= 0 ? theme.noticeTextLight : theme.errorText;
  const [originalColor, convertedColor] = getColorScale('qualitative');

  const formatOriginal = (value: number) =>
    currency !== null && isForeignAccount
      ? formatAmount(value, currency)
      : integerToCurrency(value);
  const formatConverted = (point: ChartPoint) =>
    (point.isApproximate ? '≈ ' : '') +
    formatAmount(point.converted, defaultCurrencyCode);

  const shownPoint = hoveredPoint ?? data?.[data.length - 1] ?? null;
  const labelWidth =
    mode === 'original' && !isForeignAccount ? LABEL_WIDTH : WIDE_LABEL_WIDTH;

  // State to track if the chart is hovered (used to conditionally render PrivacyFilter)
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View ref={ref} style={{ margin: 10, ...style }}>
      <AutoSizer
        renderProp={({ width = 0, height = 0 }) => {
          if (width === 0 || height === 0) {
            return null;
          }

          if (data === null) {
            return (
              <div style={{ width, height }}>
                <LoadingIndicator />
              </div>
            );
          }

          return (
            <View style={{ width }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                  setIsHovered(false);
                  setHoveredPoint(null);
                }}
              >
                <AreaChart
                  data={data}
                  width={width - labelWidth}
                  height={height}
                  // Set here rather than while the tooltip renders
                  onMouseMove={state => {
                    const point = data[Number(state.activeTooltipIndex)];
                    if (point) {
                      setHoveredPoint(point);
                    }
                  }}
                >
                  <defs>
                    <linearGradient
                      id="fillLight"
                      x1="0.9"
                      y1="0"
                      x2="0.3"
                      y2="1"
                    >
                      <stop stopColor={theme.noticeTextLight} stopOpacity={1} />
                      <stop
                        offset="90%"
                        stopColor={theme.noticeTextLight}
                        stopOpacity={0.2}
                      />
                    </linearGradient>
                    <linearGradient
                      id="fillError"
                      x1="0.9"
                      y1="0"
                      x2="0.3"
                      y2="1"
                    >
                      <stop stopColor={theme.errorText} stopOpacity={1} />
                      <stop
                        offset="90%"
                        stopColor={theme.errorText}
                        stopOpacity={0.2}
                      />
                    </linearGradient>
                  </defs>
                  {mode === 'both' ? (
                    // Each currency is scaled on its own axis, so a balance
                    // in pesos doesn't flatten one in dollars
                    <>
                      <YAxis
                        yAxisId="balance"
                        domain={['dataMin', 'dataMax']}
                        hide
                      />
                      <YAxis
                        yAxisId="converted"
                        domain={['dataMin', 'dataMax']}
                        hide
                      />
                    </>
                  ) : (
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                  )}
                  <RechartsTooltip
                    contentStyle={{
                      display: 'none',
                    }}
                    labelFormatter={() => ''}
                    isAnimationActive={false}
                  />
                  {mode === 'both' ? (
                    // The two series overlap rather than stack, each on its
                    // own scale
                    <>
                      <Area
                        yAxisId="balance"
                        type="monotone"
                        dataKey="balance"
                        stroke={originalColor}
                        fill={originalColor}
                        fillOpacity={0.25}
                        strokeWidth={2}
                        {...animationProps}
                      />
                      <Area
                        yAxisId="converted"
                        type="monotone"
                        dataKey="converted"
                        stroke={convertedColor}
                        fill={convertedColor}
                        fillOpacity={0.25}
                        strokeWidth={2}
                        {...animationProps}
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey={trendKey}
                      stroke={color}
                      strokeWidth={2}
                      {...animationProps}
                      fill={
                        color === theme.noticeTextLight
                          ? 'url(#fillLight)'
                          : 'url(#fillError)'
                      }
                    />
                  )}
                </AreaChart>

                <SpaceBetween
                  direction="vertical"
                  style={{
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    width: labelWidth,
                    textAlign: 'right',
                    ...styles.verySmallText,
                  }}
                >
                  {percentageChange === 0 ? (
                    <div />
                  ) : (
                    <Text style={{ color }}>
                      {percentageChange >= 0 ? '+' : ''}
                      {percentageChange.toFixed(1)}%
                    </Text>
                  )}

                  {shownPoint && (
                    <View>
                      <Text style={{ fontWeight: 800 }}>{shownPoint.date}</Text>
                      <PrivacyFilter activationFilters={[() => !isHovered]}>
                        {mode !== 'converted' && (
                          <Text
                            style={
                              mode === 'both' ? { color: originalColor } : {}
                            }
                          >
                            {formatOriginal(shownPoint.balance)}
                          </Text>
                        )}
                        {mode !== 'original' && (
                          <Text
                            style={
                              mode === 'both' ? { color: convertedColor } : {}
                            }
                          >
                            {formatConverted(shownPoint)}
                          </Text>
                        )}
                      </PrivacyFilter>
                    </View>
                  )}
                </SpaceBetween>
              </div>
            </View>
          );
        }}
      />
    </View>
  );
}
