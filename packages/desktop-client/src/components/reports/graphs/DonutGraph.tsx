import React from 'react';

import { css } from 'glamor';
import {
  PieChart,
  Pie,
  Cell,
  //Legend,
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
import numberFormatterTooltip from '../numberFormatter';

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

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
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

/* Descoped for future PR
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
*/

type DonutGraphProps = {
  style?: CSSProperties;
  data;
  groupBy;
  balanceTypeOp;
  empty;
  compact: boolean;
  domain?: {
    y?: [number, number];
  };
};

function DonutGraph({
  style,
  data,
  groupBy,
  empty,
  balanceTypeOp,
  compact,
}: DonutGraphProps) {
  const colorScale = getColorScale('qualitative');
  const yAxis = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';
  const splitData = ['Month', 'Year'].includes(groupBy) ? 'monthData' : 'data';

  const getVal = obj => {
    if (balanceTypeOp === 'totalDebts') {
      return -1 * obj[balanceTypeOp];
    } else {
      return obj[balanceTypeOp];
    }
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data[splitData] && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <PieChart width={width} height={height}>
                {
                  //<Legend content={<CustomLegend />} />
                }
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                <Pie
                  dataKey={val => getVal(val)}
                  nameKey={yAxis}
                  isAnimationActive={false}
                  data={data[splitData].filter(i =>
                    !empty ? i[balanceTypeOp] !== 0 : true,
                  )}
                  innerRadius={Math.min(width, height) * 0.2}
                  fill="#8884d8"
                >
                  {data[splitData].map((entry, index) => (
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
