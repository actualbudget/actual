import React from 'react';

import { css } from 'glamor';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import Text from '../../common/Text';
import PrivacyFilter from '../../PrivacyFilter';
import { getColorScale } from '../chart-theme';
import Container from '../Container';

type DonutGraphProps = {
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

function DonutGraph({
  style,
  data,
  split,
  typeOp,
  OnChangeLegend,
  compact,
  domain,
}: DonutGraphProps) {
  const colorScale = getColorScale('qualitative');
  const yAxis = [5, 6].includes(split) ? 'date' : 'name';

  type PayloadItem = {
    name: string;
    value: string;
    color: string;
    payload: {
      date: string;
      assets: number | string;
      debt: number | string;
      networth: number | string;
      change: number | string;
      fill: string;
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
        color: leg.color,
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
              <strong>{payload[0].name}</strong>
            </div>
            <div style={{ lineHeight: 1.5 }}>
              <PrivacyFilter>
                <Text style={{ color: payload[0].payload.fill }}>
                  {amountToCurrency(payload[0].value)}
                </Text>
              </PrivacyFilter>
            </div>
          </div>
        </div>
      );
    }
  };

  const getVal = obj => {
    if (typeOp === 'totalDebts') {
      return -1 * obj[typeOp];
    } else {
      return obj[typeOp];
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
              <PieChart width={width} height={height}>
                <Legend content={<CustomLegend />} />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                <Pie
                  dataKey={val => getVal(val)}
                  nameKey={yAxis}
                  isAnimationActive={false}
                  data={yAxis === 'date' ? data.monthData : data.data}
                  outerRadius={200}
                  innerRadius={100}
                  fill="#8884d8"
                >
                  {data.data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colorScale[index % colorScale.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default DonutGraph;
