import React, {
  useState,
  useEffect,
  useMemo,
  type CSSProperties,
  type Ref,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { subMonths, format, eachMonthOfInterval } from 'date-fns';
import { AreaChart, Area, YAxis, Tooltip as RechartsTooltip } from 'recharts';

import * as monthUtils from 'loot-core/shared/months';
import { integerToCurrency } from 'loot-core/shared/util';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useLocale } from '@desktop-client/hooks/useLocale';
import * as query from '@desktop-client/queries';
import { liveQuery } from '@desktop-client/queries/liveQuery';

const LABEL_WIDTH = 70;

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
  const [balanceData, setBalanceData] = useState<
    Array<{ date: string; balance: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [hoveredValue, setHoveredValue] = useState<{
    date: string;
    balance: number;
  } | null>(null);
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [monthlyTotals, setMonthlyTotals] = useState<Array<{
    date: string;
    balance: number;
  }> | null>(null);

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
      .select([{ date: { $month: '$date' } }, { amount: { $sum: '$amount' } }]);

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
      typeof liveQuery<{ date: string; amount: number }>
    > = liveQuery(monthlyTotalsQuery, {
      onData: (data: Array<{ date: string; amount: number }>) => {
        setMonthlyTotals(
          data.map(d => ({
            date: d.date,
            balance: d.amount,
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
    };
  }, [accountId, locale]);

  // Process data when both startingBalance and monthlyTotals are available
  useEffect(() => {
    if (startingBalance !== null && monthlyTotals !== null) {
      const endDate = new Date();
      const startDate = subMonths(endDate, 12);
      const months = eachMonthOfInterval({
        start: startDate,
        end: endDate,
      }).map(m => format(m, 'yyyy-MM'));

      function processData(
        startingBalanceValue: number,
        monthlyTotalsValue: Array<{ date: string; balance: number }>,
      ) {
        let currentBalance = startingBalanceValue;
        const totals = [...monthlyTotalsValue];
        totals.reverse().forEach(month => {
          currentBalance = currentBalance + month.balance;
          month.balance = currentBalance;
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
            }),
          );
        } else if (totals.length < months.length) {
          // iterate through each array together and add in missing data
          let totalsIndex = 0;
          let mostRecent = startingBalanceValue;
          months.forEach(expectedMonth => {
            if (totalsIndex > totals.length - 1) {
              // fill in the data at the end of the window
              totals.push({
                date: expectedMonth,
                balance: mostRecent,
              });
            } else if (totals[totalsIndex].date === expectedMonth) {
              // a matched month
              mostRecent = totals[totalsIndex].balance;
              totalsIndex += 1;
            } else {
              // a missing month in the middle
              totals.push({
                date: expectedMonth,
                balance: mostRecent,
              });
            }
          });
        }

        const balances = totals
          .sort((a, b) => monthUtils.differenceInCalendarMonths(a.date, b.date))
          .map(t => {
            return {
              balance: t.balance,
              date: monthUtils.format(t.date, 'MMM yyyy', locale),
            };
          });

        setBalanceData(balances);
        setHoveredValue(balances[balances.length - 1]);
        setLoading(false);
      }

      processData(startingBalance, monthlyTotals);
    }
  }, [startingBalance, monthlyTotals, locale]);

  // State to track if the chart is hovered (used to conditionally render PrivacyFilter)
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View ref={ref} style={{ margin: 10, ...style }}>
      <AutoSizer>
        {({ width, height }: { width: number; height: number }) => {
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
                  <YAxis domain={['dataMin', 'dataMax']} hide={true} />
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
                        <Text>{integerToCurrency(hoveredValue.balance)}</Text>
                      </PrivacyFilter>
                    </View>
                  )}
                </SpaceBetween>
              </div>
            </View>
          );
        }}
      </AutoSizer>
    </View>
  );
}
