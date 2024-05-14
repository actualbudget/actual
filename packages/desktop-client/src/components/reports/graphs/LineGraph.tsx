// @ts-strict-ignore
import React, { useState } from 'react';

import { css } from 'glamor';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/src/shared/util';
import { type DataEntity } from 'loot-core/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePrivacyMode } from '../../../hooks/usePrivacyMode';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Container } from '../Container';
import { getCustomTick } from '../getCustomTick';
import { numberFormatterTooltip } from '../numberFormatter';

type PayloadItem = {
  dataKey: string;
  value: number;
  date: string;
  color: string;
  payload: {
    date: string;
  };
};

type CustomTooltipProps = {
  compact: boolean;
  tooltip: string;
  active?: boolean;
  payload?: PayloadItem[];
};

const CustomTooltip = ({
  compact,
  tooltip,
  active,
  payload,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    let sumTotals = 0;
    return (
      <div
        className={`${css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}`}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>{payload[0].payload.date}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            {payload
              .sort((p1: PayloadItem, p2: PayloadItem) => p2.value - p1.value)
              .map((p: PayloadItem, index: number) => {
                sumTotals += p.value;
                return (
                  (compact ? index < 4 : true) && (
                    <AlignedText
                      key={index}
                      left={p.dataKey}
                      right={amountToCurrency(p.value)}
                      style={{
                        color: p.color,
                        textDecoration:
                          tooltip === p.dataKey ? 'underline' : 'inherit',
                      }}
                    />
                  )
                );
              })}
            {payload.length > 5 && compact && '...'}
            <AlignedText
              left="Total"
              right={amountToCurrency(sumTotals)}
              style={{
                fontWeight: 600,
              }}
            />
          </div>
        </div>
      </div>
    );
  }
};

type LineGraphProps = {
  style?: CSSProperties;
  data: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  compact?: boolean;
  balanceTypeOp: string;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export function LineGraph({
  style,
  data,
  filters,
  groupBy,
  compact,
  balanceTypeOp,
  showHiddenCategories,
  showOffBudget,
}: LineGraphProps) {
  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const privacyMode = usePrivacyMode();
  const [pointer, setPointer] = useState('');
  const [tooltip, setTooltip] = useState('');
  const { isNarrowWidth } = useResponsive();

  const largestValue = data.intervalData
    .map(c => c[balanceTypeOp])
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 5;

  const onShowActivity = (item, id, payload) => {
    const amount = balanceTypeOp === 'totalDebts' ? 'lte' : 'gte';
    const field = groupBy === 'Interval' ? null : groupBy.toLowerCase();
    const hiddenCategories = categories.list
      .filter(f => f.hidden)
      .map(e => e.id);
    const offBudgetAccounts = accounts.filter(f => f.offbudget).map(e => e.id);

    const conditions = [
      ...filters,
      { field, op: 'is', value: id, type: 'id' },
      {
        field: 'date',
        op: 'is',
        value: payload.payload.dateStart,
        options: { date: true },
      },
      balanceTypeOp !== 'totalTotals' && {
        field: 'amount',
        op: amount,
        value: 0,
        type: 'number',
      },
      hiddenCategories.length > 0 &&
        !showHiddenCategories && {
          field: 'category',
          op: 'notOneOf',
          value: hiddenCategories,
          type: 'id',
        },
      offBudgetAccounts.length > 0 &&
        !showOffBudget && {
          field: 'account',
          op: 'notOneOf',
          value: offBudgetAccounts,
          type: 'id',
        },
    ].filter(f => f);
    navigate('/accounts', {
      state: {
        goBack: true,
        conditions,
        categoryId: item.id,
      },
    });
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <LineChart
                width={width}
                height={height}
                data={data.intervalData}
                margin={{ top: 10, right: 10, left: leftMargin, bottom: 10 }}
                style={{ cursor: pointer }}
              >
                {(!isNarrowWidth || !compact) && (
                  <Tooltip
                    content={
                      <CustomTooltip compact={compact} tooltip={tooltip} />
                    }
                    formatter={numberFormatterTooltip}
                    isAnimationActive={false}
                  />
                )}
                {!compact && (
                  <>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageText }}
                    />
                    <YAxis
                      tickFormatter={value =>
                        getCustomTick(
                          amountToCurrencyNoDecimal(value),
                          privacyMode,
                        )
                      }
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageText }}
                      tickSize={0}
                    />
                  </>
                )}
                {data.legend.map((entry, index) => {
                  return (
                    <Line
                      key={index}
                      strokeWidth={2}
                      type="monotone"
                      dataKey={entry.name}
                      stroke={entry.color}
                      activeDot={{
                        r: entry.name === tooltip && !compact ? 8 : 3,
                        onMouseEnter: () => {
                          setTooltip(entry.name);
                          if (!['Group', 'Interval'].includes(groupBy)) {
                            setPointer('pointer');
                          }
                        },
                        onMouseLeave: () => {
                          setPointer('');
                          setTooltip('');
                        },
                        onClick: (e, payload) =>
                          !isNarrowWidth &&
                          !['Group', 'Interval'].includes(groupBy) &&
                          onShowActivity(e, entry.id, payload),
                      }}
                    />
                  );
                })}
              </LineChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
