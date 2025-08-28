// @ts-strict-ignore
import React, { useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
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
  type balanceTypeOpType,
  type DataEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

import { Container } from '@desktop-client/components/reports/Container';
import { getCustomTick } from '@desktop-client/components/reports/getCustomTick';
import { numberFormatterTooltip } from '@desktop-client/components/reports/numberFormatter';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat, type FormatType } from '@desktop-client/hooks/useFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

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
  format: (value: unknown, type: FormatType) => string;
};

const CustomTooltip = ({
  compact,
  tooltip,
  active,
  payload,
  label,
  format,
}: CustomTooltipProps) => {
  const { t } = useTranslation();
  const sumTotals = useRef(0);
  if (active && payload && payload.length) {
    return (
      <div
        className={css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}
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
                sumTotals.current += pay.value;
                return (
                  pay.value !== 0 &&
                  (compact ? i < 5 : true) && (
                    <AlignedText
                      key={pay.name}
                      left={pay.name}
                      right={format(pay.value, 'financial')}
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
              left={t('Total')}
              right={format(sumTotals.current, 'financial')}
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
  const display =
    props.value && `${props.format(props.value, 'financial-no-decimals')}`;
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
  balanceTypeOp: balanceTypeOpType;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTooltip?: boolean;
  interval?: string;
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
  showTooltip = true,
  interval,
}: StackedBarGraphProps) {
  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  const customLabelWithFormat = props => customLabel({ ...props, format });

  const [pointer, setPointer] = useState('');
  const [tooltip, setTooltip] = useState('');

  const largestValue = data.intervalData
    .map(c => c[balanceTypeOp])
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 0;

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
                margin={{ top: 0, right: 0, left: leftMargin, bottom: 10 }}
                style={{ cursor: pointer }}
                stackOffset="sign" //stacked by sign
              >
                {showTooltip && (
                  <Tooltip
                    content={
                      <CustomTooltip
                        compact={compact}
                        tooltip={tooltip}
                        format={format}
                      />
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
                {!compact && <CartesianGrid strokeDasharray="3 3" />}
                {!compact && (
                  <YAxis
                    tickFormatter={value =>
                      getCustomTick(
                        format(value, 'financial-no-decimals'),
                        privacyMode,
                      )
                    }
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                    tickSize={0}
                  />
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
                        ((compact && showTooltip) || !compact) &&
                        !['Group', 'Interval'].includes(groupBy) &&
                        showActivity({
                          navigate,
                          categories,
                          accounts,
                          balanceTypeOp,
                          filters,
                          showHiddenCategories,
                          showOffBudget,
                          type: 'time',
                          startDate: e.intervalStartDate,
                          endDate: e.intervalEndDate,
                          field: groupBy.toLowerCase(),
                          id: entry.id,
                          interval,
                        })
                      }
                    >
                      {viewLabels && !compact && (
                        <LabelList
                          dataKey={entry.name}
                          content={customLabelWithFormat}
                        />
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
