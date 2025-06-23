import React, { useState, useEffect, useMemo } from 'react';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { subMonths, format } from 'date-fns';
import { LineChart, Line, YAxis, Tooltip as RechartsTooltip } from 'recharts';

import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { integerToCurrency } from 'loot-core/shared/util';

import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

const CHART_HEIGHT = 70;
const CHART_WIDTH = 280;
const LABEL_WIDTH = 70;
const TOTAL_WIDTH = CHART_WIDTH + LABEL_WIDTH;

type BalanceHistoryGraphProps = {
  accountId: string;
};

type Balance = {
  date: string;
  balance: number;
};

export function BalanceHistoryGraph({ accountId }: BalanceHistoryGraphProps) {
  const [balanceData, setBalanceData] = useState<
    Array<{ date: string; balance: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [hoveredValue, setHoveredValue] = useState<{
    date: string;
    balance: number;
  } | null>(null);

  const percentageChange = useMemo(() => {
    if (balanceData.length < 2) return 0;
    const firstBalance = balanceData[0].balance;
    const lastBalance = balanceData[balanceData.length - 1].balance;
    if (firstBalance === 0) return 0;
    return ((lastBalance - firstBalance) / Math.abs(firstBalance)) * 100;
  }, [balanceData]);

  useEffect(() => {
    async function fetchBalanceHistory() {
      const endDate = new Date();
      const startDate = subMonths(endDate, 12);

      const [starting, totals]: [number, Balance[]] = await Promise.all([
        aqlQuery(
          q('transactions')
            .filter({
              account: accountId,
              date: { $lt: monthUtils.firstDayOfMonth(startDate) },
            })
            .calculate({ $sum: '$amount' }),
        ).then(({ data }) => data),

        aqlQuery(
          q('transactions')
            .filter({
              account: accountId,
              $and: [
                { date: { $gte: monthUtils.firstDayOfMonth(startDate) } },
                { date: { $lte: monthUtils.lastDayOfMonth(endDate) } },
              ],
            })
            .groupBy({ $month: '$date' })
            .select([
              { date: { $month: '$date' } },
              { amount: { $sum: '$amount' } },
            ]),
        ).then(({ data }) =>
          data.map(d => {
            return {
              date: format(monthUtils.addMonths(d.date, 1), 'MMM yyy'),
              balance: d.amount,
            };
          }),
        ),
      ]);

      let balance = starting;
      totals.reverse().map(month => {
        balance = balance + month.balance;
        month.balance = balance;
        return balance;
      });

      setBalanceData(totals);
      setHoveredValue(totals[totals.length - 1]);
      setLoading(false);
    }

    fetchBalanceHistory();
  }, [accountId]);

  if (loading) {
    return (
      <div style={{ width: TOTAL_WIDTH, height: CHART_HEIGHT, marginTop: 10 }}>
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div style={{ width: TOTAL_WIDTH, marginTop: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
        }}
      >
        <LineChart data={balanceData} width={CHART_WIDTH} height={CHART_HEIGHT}>
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
          <Line
            type="monotone"
            dataKey="balance"
            stroke={
              percentageChange >= 0 ? theme.noticeTextLight : theme.errorText
            }
            strokeWidth={2}
            dot={false}
            animationDuration={0}
          />
        </LineChart>

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
            <Text
              style={{
                color:
                  percentageChange >= 0
                    ? theme.noticeTextLight
                    : theme.errorText,
              }}
            >
              {percentageChange >= 0 ? '+' : ''}
              {percentageChange.toFixed(1)}%
            </Text>
          )}

          {hoveredValue && (
            <Text>
              <div style={{ fontWeight: 800 }}>{hoveredValue.date}</div>
              <div>{integerToCurrency(hoveredValue.balance)}</div>
            </Text>
          )}
        </SpaceBetween>
      </div>
    </div>
  );
}
