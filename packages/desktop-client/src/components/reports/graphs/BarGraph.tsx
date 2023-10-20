import React from 'react';

import { css } from 'glamor';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import AlignedText from '../../common/AlignedText';
import PrivacyFilter from '../../PrivacyFilter';
import { getColorScale } from '../chart-theme';
import Container from '../Container';

type BarGraphProps = {
  style?: CSSProperties;
  data;
  split;
  typeOp;
  OnChangeLegend;
  compact: boolean;
  domain?: {
    y?: [number, number];
  };
};
type PotentialNumber = number | string | undefined | null;

const numberFormatterTooltip = (value: PotentialNumber): number | null => {
  if (typeof value === 'number') {
    return Math.round(value);
  }
  return null; // or some default value for other cases
};

function BarGraph({
  style,
  data,
  split,
  typeOp,
  OnChangeLegend,
  compact,
  domain,
}: BarGraphProps) {
  const colorScale = getColorScale('qualitative');
  const yAxis = [5, 6].includes(split) ? 'date' : 'name';

  type PayloadItem = {
    value: string;
    payload: {
      name: string;
      totalAssets: number | string;
      totalDebts: number | string;
      totalTotals: number | string;
      networth: number | string;
      totalChange: number | string;
    };
  };

  type CustomTooltipProps = {
    active?: boolean;
    payload?: PayloadItem[];
    label?: string;
  };

  type CustomLegendProps = {
    active?: boolean;
    payload?: PayloadItem[];
    label?: string;
  };

  const CustomLegend = ({ active, payload, label }: CustomLegendProps) => {
    const agg = payload.map(leg => {
      return {
        name: leg.value,
        //color: leg.color,
      };
    });

    OnChangeLegend(agg);

    return <div />;
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`${css(
            {
              zIndex: 1000,
              pointerEvents: 'none',
              borderRadius: 2,
              boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
              backgroundColor: theme.alt2MenuBackground,
              color: theme.alt2MenuItemText,
              padding: 10,
            },
            style,
          )}`}
        >
          <div>
            <div style={{ marginBottom: 10 }}>
              <strong>{payload[0].payload[yAxis]}</strong>
            </div>
            <div style={{ lineHeight: 1.5 }}>
              <PrivacyFilter>
                <AlignedText
                  left="Assets:"
                  right={amountToCurrency(payload[0].payload.totalAssets)}
                />
                <AlignedText
                  left="Debt:"
                  right={amountToCurrency(payload[0].payload.totalDebts)}
                />
                <AlignedText
                  left="All:"
                  right={amountToCurrency(payload[0].payload.totalTotals)}
                />
                <AlignedText
                  left="Change:"
                  right={
                    <strong>
                      {amountToCurrency(payload[0].payload.totalChange)}
                    </strong>
                  }
                />
              </PrivacyFilter>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
        data.data && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <BarChart
                width={width}
                height={height}
                data={yAxis === 'date' ? data.monthData : data.data}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <Legend content={<CustomLegend />} />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={yAxis} />
                <YAxis />
                <Bar dataKey={...typeOp}>
                  {data.data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colorScale[index % colorScale.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default BarGraph;
