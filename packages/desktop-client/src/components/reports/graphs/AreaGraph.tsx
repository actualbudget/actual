import React from 'react';

import { css } from 'glamor';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import usePrivacyMode from 'loot-core/src/client/privacy';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import AlignedText from '../../common/AlignedText';
import PrivacyFilter from '../../PrivacyFilter';
import Container from '../Container';
import numberFormatterTooltip from '../numberFormatter';

type PayloadItem = {
  payload: {
    date: string;
    totalAssets: number | string;
    totalDebts: number | string;
    totalTotals: number | string;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  balanceTypeOp?: string;
};

const CustomTooltip = ({
  active,
  payload,
  balanceTypeOp,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={`${css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuAutoCompleteBackground,
          color: theme.menuAutoCompleteText,
          padding: 10,
        })}`}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>{payload[0].payload.date}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <PrivacyFilter>
              {['totalAssets', 'totalTotals'].includes(balanceTypeOp) && (
                <AlignedText
                  left="Assets:"
                  right={amountToCurrency(payload[0].payload.totalAssets)}
                />
              )}
              {['totalDebts', 'totalTotals'].includes(balanceTypeOp) && (
                <AlignedText
                  left="Debt:"
                  right={amountToCurrency(payload[0].payload.totalDebts)}
                />
              )}
              {['totalTotals'].includes(balanceTypeOp) && (
                <AlignedText
                  left="Net:"
                  right={
                    <strong>
                      {amountToCurrency(payload[0].payload.totalTotals)}
                    </strong>
                  }
                />
              )}
            </PrivacyFilter>
          </div>
        </div>
      </div>
    );
  }
};

type AreaGraphProps = {
  style?: CSSProperties;
  data;
  balanceTypeOp;
  compact?: boolean;
};

function AreaGraph({ style, data, balanceTypeOp, compact }: AreaGraphProps) {
  let privacyMode = usePrivacyMode();

  const tickFormatter = tick => {
    if (!privacyMode) return `${Math.round(tick).toLocaleString()}`; // Formats the tick values as strings with commas
    return '...';
  };

  const gradientOffset = () => {
    const dataMax = Math.max(...data.monthData.map(i => i[balanceTypeOp]));
    const dataMin = Math.min(...data.monthData.map(i => i[balanceTypeOp]));

    if (dataMax <= 0) {
      return 0;
    }
    if (dataMin >= 0) {
      return 1;
    }

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
        data.monthData && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <AreaChart
                width={width}
                height={height}
                data={data.monthData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                {compact ? null : (
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                )}
                {compact ? null : (
                  <XAxis
                    dataKey="date"
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                  />
                )}
                {compact ? null : (
                  <YAxis
                    dataKey={...balanceTypeOp}
                    domain={['auto', 'auto']}
                    tickFormatter={tickFormatter}
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                  />
                )}
                <Tooltip
                  content={<CustomTooltip balanceTypeOp={balanceTypeOp} />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset={off}
                      stopColor={theme.reportsBlue}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset={off}
                      stopColor={theme.reportsRed}
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                </defs>

                <Area
                  type="linear"
                  dot={false}
                  activeDot={false}
                  animationDuration={0}
                  dataKey={...balanceTypeOp}
                  stroke={theme.reportsBlue}
                  fill="url(#splitColor)"
                  fillOpacity={1}
                />
              </AreaChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default AreaGraph;
