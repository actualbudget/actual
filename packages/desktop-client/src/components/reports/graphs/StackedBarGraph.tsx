// @ts-strict-ignore
import React, { useState } from 'react';

import { css } from 'glamor';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts';

import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/src/shared/util';
import { type DataEntity } from 'loot-core/src/types/models/reports';
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

import { renderCustomLabel } from './renderCustomLabel';

type PayloadItem = {
  name: string;
  value: number;
  color: string;
  payload: {
    name: string;
    color: number | string;
  };
};

type CustomTooltipProps = {
  compact: boolean;
  tooltip: string;
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
};

const CustomTooltip = ({
  compact,
  tooltip,
  active,
  payload,
  label,
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
            <strong>{label}</strong>
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {payload
              .slice(0)
              .reverse()
              .map((pay, i) => {
                sumTotals += pay.value;
                return (
                  pay.value !== 0 &&
                  (compact ? i < 5 : true) && (
                    <AlignedText
                      key={pay.name}
                      left={pay.name}
                      right={amountToCurrency(pay.value)}
                      style={{
                        color: pay.color,
                        textDecoration:
                          tooltip === pay.name ? 'underline' : 'inherit',
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

const customLabel = props => {
  const calcX = props.x + props.width / 2;
  const calcY = props.y + props.height / 2;
  const textAnchor = 'middle';
  const display = props.value && `${amountToCurrencyNoDecimal(props.value)}`;
  const textSize = '12px';
  const showLabel = props.height;
  const showLabelThreshold = 20;
  const fill = theme.reportsInnerLabel;

  return renderCustomLabel(
    calcX,
    calcY,
    textAnchor,
    display,
    textSize,
    showLabel,
    showLabelThreshold,
    fill,
  );
};

type StackedBarGraphProps = {
  style?: CSSProperties;
  data: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  compact?: boolean;
  viewLabels: boolean;
  balanceTypeOp: string;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export function StackedBarGraph({
  style,
  data,
  filters,
  groupBy,
  compact,
  viewLabels,
  balanceTypeOp,
  showHiddenCategories,
  showOffBudget,
}: StackedBarGraphProps) {
  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const privacyMode = usePrivacyMode();
  const { isNarrowWidth } = useResponsive();
  const [pointer, setPointer] = useState('');
  const [tooltip, setTooltip] = useState('');

  const largestValue = data.intervalData
    .map(c => c[balanceTypeOp])
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 0;

  const onShowActivity = (item, id) => {
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
        value: item.dateStart,
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
        data.intervalData && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <BarChart
                width={width}
                height={height}
                data={data.intervalData}
                margin={{ top: 0, right: 0, left: leftMargin, bottom: 0 }}
                style={{ cursor: pointer }}
              >
                {(!isNarrowWidth || !compact) && (
                  <Tooltip
                    content={
                      <CustomTooltip compact={compact} tooltip={tooltip} />
                    }
                    formatter={numberFormatterTooltip}
                    isAnimationActive={false}
                    cursor={{ fill: 'transparent' }}
                  />
                )}
                <XAxis
                  dataKey="date"
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                />
                {!compact && (
                  <>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageText }}
                    />
                    <CartesianGrid strokeDasharray="3 3" />
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
                {data.legend
                  .slice(0)
                  .reverse()
                  .map(entry => (
                    <Bar
                      key={entry.name}
                      dataKey={entry.name}
                      stackId="a"
                      fill={entry.color}
                      onMouseLeave={() => {
                        setPointer('');
                        setTooltip('');
                      }}
                      onMouseEnter={() => {
                        setTooltip(entry.name);
                        if (!['Group', 'Interval'].includes(groupBy)) {
                          setPointer('pointer');
                        }
                      }}
                      onClick={e =>
                        !isNarrowWidth &&
                        !['Group', 'Interval'].includes(groupBy) &&
                        onShowActivity(e, entry.id)
                      }
                    >
                      {viewLabels && !compact && (
                        <LabelList dataKey={entry.name} content={customLabel} />
                      )}
                    </Bar>
                  ))}
              </BarChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
