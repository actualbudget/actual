import React, { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { eachMonthOfInterval, format, subMonths } from 'date-fns';
import { Area, AreaChart, Tooltip as RechartsTooltip, YAxis } from 'recharts';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import * as query from '#queries';
import { liveQuery } from '#queries/liveQuery';

const LABEL_WIDTH = 70;

type BalanceHistoryGraphProps = {
  accountId?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
  'aria-label'?: string;
  /** A foreign account's currency, charted natively beside the base. */
  native?: { currency: string; precision: number };
};

type BalancePoint = { date: string; balance: number; native?: number };

export function BalanceHistoryGraph({
  accountId,
  style,
  ref,
  'aria-label': ariaLabel,
  native,
}: BalanceHistoryGraphProps) {
  const charted = !!native;
  const locale = useLocale();
  const formatAmount = useFormat(useAmountPrecision());
  const animationProps = useRechartsAnimation({ isAnimationActive: false });
  const [balanceData, setBalanceData] = useState<BalancePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredValue, setHoveredValue] = useState<BalancePoint | null>(null);
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  // Zero when no native line is charted.
  const [startingNative, setStartingNative] = useState<number | null>(null);
  const [monthlyTotals, setMonthlyTotals] = useState<BalancePoint[] | null>(
    null,
  );

  const percentageChange = useMemo(() => {
    if (balanceData.length < 2) return 0;
    const firstBalance = balanceData[0].balance;
    const lastBalance = balanceData[balanceData.length - 1].balance;
    if (firstBalance === 0) return 0;
    return ((lastBalance - firstBalance) / Math.abs(firstBalance)) * 100;
  }, [balanceData]);
  const color = useMemo(
    () => (percentageChange >= 0 ? theme.noticeTextLight : theme.errorText),
    [percentageChange],
  );

  useEffect(() => {
    // Reset state when accountId changes
    setStartingBalance(null);
    setStartingNative(charted ? null : 0);
    setMonthlyTotals(null);
    setLoading(true);

    const endDate = new Date();
    const startDate = subMonths(endDate, 12);

    const startingBalanceQuery = query
      .transactions(accountId)
      .filter({
        date: { $lt: monthUtils.firstDayOfMonth(startDate) },
      })
      .calculate({ $sum: '$amount' });
    const monthlyTotalsQuery = query
      .transactions(accountId)
      .filter({
        $and: [
          { date: { $gte: monthUtils.firstDayOfMonth(startDate) } },
          { date: { $lte: monthUtils.lastDayOfMonth(endDate) } },
        ],
      })
      .groupBy({ $month: '$date' })
      .select([
        { date: { $month: '$date' } },
        { amount: { $sum: '$amount' } },
        { native: { $sum: '$transaction_amount' } },
      ]);
    // A foreign account's rows hold their native amounts beside the base.
    const startingNativeLive = charted
      ? liveQuery<number>(
          query
            .transactions(accountId)
            .filter({ date: { $lt: monthUtils.firstDayOfMonth(startDate) } })
            .calculate({ $sum: '$transaction_amount' }),
          {
            onData: (data: number[]) => setStartingNative(data[0] || 0),
            onError: error => {
              console.error('Error fetching starting native balance:', error);
              setLoading(false);
            },
          },
        )
      : null;

    const startingBalanceLive: ReturnType<typeof liveQuery<number>> = liveQuery(
      startingBalanceQuery,
      {
        onData: (data: number[]) => {
          setStartingBalance(data[0] || 0);
        },
        onError: error => {
          console.error('Error fetching starting balance:', error);
          setLoading(false);
        },
      },
    );

    const monthlyTotalsLive: ReturnType<
      typeof liveQuery<{
        date: string;
        amount: number;
        native: number | null;
      }>
    > = liveQuery(monthlyTotalsQuery, {
      onData: (
        data: Array<{ date: string; amount: number; native: number | null }>,
      ) => {
        setMonthlyTotals(
          data.map(d => ({
            date: d.date,
            balance: d.amount,
            native: d.native ?? 0,
          })),
        );
      },
      onError: error => {
        console.error('Error fetching monthly totals:', error);
        setLoading(false);
      },
    });

    return () => {
      startingBalanceLive?.unsubscribe();
      monthlyTotalsLive?.unsubscribe();
      startingNativeLive?.unsubscribe();
    };
  }, [accountId, locale, charted]);

  // Process data when both startingBalance and monthlyTotals are available
  useEffect(() => {
    if (
      startingBalance !== null &&
      startingNative !== null &&
      monthlyTotals !== null
    ) {
      const endDate = new Date();
      const startDate = subMonths(endDate, 12);
      const months = eachMonthOfInterval({
        start: startDate,
        end: endDate,
      }).map(m => format(m, 'yyyy-MM'));

      function processData(
        startingBalanceValue: number,
        startingNativeValue: number,
        monthlyTotalsValue: BalancePoint[],
      ) {
        let currentBalance = startingBalanceValue;
        let currentNative = startingNativeValue;
        const totals = monthlyTotalsValue.map(month => ({ ...month }));
        totals.reverse().forEach(month => {
          currentBalance = currentBalance + month.balance;
          month.balance = currentBalance;
          currentNative = currentNative + (month.native ?? 0);
          month.native = currentNative;
        });

        // if the account doesn't have recent transactions
        // then the empty months will be missing from our data
        // so add in entries for those here
        if (totals.length === 0) {
          //handle case of no transactions in the last year
          months.forEach(expectedMonth =>
            totals.push({
              date: expectedMonth,
              balance: startingBalanceValue,
              native: startingNativeValue,
            }),
          );
        } else if (totals.length < months.length) {
          // iterate through each array together and add in missing data
          let totalsIndex = 0;
          let mostRecent = startingBalanceValue;
          let mostRecentNative = startingNativeValue;
          months.forEach(expectedMonth => {
            if (totalsIndex > totals.length - 1) {
              // fill in the data at the end of the window
              totals.push({
                date: expectedMonth,
                balance: mostRecent,
                native: mostRecentNative,
              });
            } else if (totals[totalsIndex].date === expectedMonth) {
              // a matched month
              mostRecent = totals[totalsIndex].balance;
              mostRecentNative = totals[totalsIndex].native ?? 0;
              totalsIndex += 1;
            } else {
              // a missing month in the middle
              totals.push({
                date: expectedMonth,
                balance: mostRecent,
                native: mostRecentNative,
              });
            }
          });
        }

        const balances = totals
          .sort((a, b) => monthUtils.differenceInCalendarMonths(a.date, b.date))
          .map(t => {
            return {
              balance: t.balance,
              ...(charted && { native: t.native }),
              date: monthUtils.format(t.date, 'MMM yyyy', locale),
            };
          });

        setBalanceData(balances);
        setHoveredValue(balances[balances.length - 1]);
        setLoading(false);
      }

      processData(startingBalance, startingNative, monthlyTotals);
    }
  }, [startingBalance, startingNative, monthlyTotals, locale, charted]);

  // State to track if the chart is hovered (used to conditionally render PrivacyFilter)
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View
      ref={ref}
      // A labeled graph names its amounts for screen readers.
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      style={{ margin: 10, ...style }}
    >
      <AutoSizer
        renderProp={({ width = 0, height = 0 }) => {
          if (width === 0 || height === 0) {
            return null;
          }

          if (loading) {
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
                onMouseLeave={() => setIsHovered(false)}
              >
                <AreaChart
                  data={balanceData}
                  width={width - LABEL_WIDTH}
                  height={height}
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
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  {native && (
                    // The native line has its own scale: the currencies differ.
                    <YAxis
                      yAxisId="native"
                      domain={['dataMin', 'dataMax']}
                      hide
                    />
                  )}
                  <RechartsTooltip
                    contentStyle={{
                      display: 'none',
                    }}
                    labelFormatter={(label, items) => {
                      const data = items[0]?.payload;
                      if (data) {
                        setHoveredValue(data);
                      }
                      return '';
                    }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={color}
                    strokeWidth={2}
                    {...animationProps}
                    fill={
                      color === theme.noticeTextLight
                        ? 'url(#fillLight)'
                        : 'url(#fillError)'
                    }
                  />
                  {native && (
                    <Area
                      type="monotone"
                      dataKey="native"
                      yAxisId="native"
                      stroke={theme.reportsBlue}
                      strokeWidth={2}
                      fill="none"
                      {...animationProps}
                    />
                  )}
                </AreaChart>

                <SpaceBetween
                  direction="vertical"
                  style={{
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    width: LABEL_WIDTH,
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

                  {hoveredValue && (
                    <View>
                      <Text style={{ fontWeight: 800 }}>
                        {hoveredValue.date}
                      </Text>
                      <PrivacyFilter activationFilters={[() => !isHovered]}>
                        <Text>
                          {formatAmount(hoveredValue.balance, 'financial')}
                        </Text>
                        {native && hoveredValue.native !== undefined && (
                          <CurrencyFormatProvider
                            currencyCode={native.currency}
                            precision={native.precision}
                          >
                            <NativeBalance amount={hoveredValue.native} />
                          </CurrencyFormatProvider>
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

/** A native balance in its account's own currency format. */
function NativeBalance({ amount }: { amount: number }) {
  const format = useFormat();
  return (
    <Text style={{ color: theme.reportsBlue }}>
      {format(amount, 'financial')}
    </Text>
  );
}
