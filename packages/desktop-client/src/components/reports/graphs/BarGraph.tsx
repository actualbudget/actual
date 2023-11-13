import React from 'react';

import { css } from 'glamor';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
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
  empty;
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
  empty,
  typeOp,
  compact,
  domain,
}: BarGraphProps) {
  const colorScale = getColorScale('qualitative');
  const yAxis = [5, 6].includes(split) ? 'date' : 'name';
  const splitData = [5, 6].includes(split) ? 'monthData' : 'data';

  type PayloadItem = {
    value: string;
    payload: {
      name: string;
      totalAssets: number | string;
      totalDebts: number | string;
      totalTotals: number | string;
      networth: number | string;
      totalChange: number | string;
      children: [tester];
    };
  };

  type tester = {
    props: {
      name: string;
      fill: string;
    };
  };

  type CustomLegendProps = {
    active?: boolean;
    payload?: PayloadItem[];
    label?: string;
  };

  const CustomLegend = ({ active, payload, label }: CustomLegendProps) => {
    const agg = payload[0].payload.children.map(leg => {
      return {
        name: leg.props.name,
        color: leg.props.fill,
      };
    });

    //OnChangeLegend(agg);

    return <div />;
  };

  type CustomTooltipProps = {
    active?: boolean;
    payload?: PayloadItem[];
    label?: string;
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
              backgroundColor: theme.menuAutoCompleteBackground,
              color: theme.menuAutoCompleteText,
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
                {['totalAssets', 'totalTotals'].includes(typeOp) && (
                  <AlignedText
                    left="Assets:"
                    right={amountToCurrency(payload[0].payload.totalAssets)}
                  />
                )}
                {['totalDebts', 'totalTotals'].includes(typeOp) && (
                  <AlignedText
                    left="Debt:"
                    right={amountToCurrency(payload[0].payload.totalDebts)}
                  />
                )}
                {['totalTotals'].includes(typeOp) && (
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

  const getVal = obj => {
    if (typeOp === 'totalDebts') {
      return -1 * obj.totalDebts;
    } else {
      return obj.totalAssets;
    }
  };

  const longestLabelLength = data[splitData]
    .map(c => c[yAxis])
    .reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
        data[splitData] && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <BarChart
                width={width}
                height={height}
                stackOffset="sign"
                data={data[splitData].filter(i =>
                  !empty ? i[typeOp] !== 0 : true,
                )}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                {!compact && <Legend content={<CustomLegend />} />}
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                {!compact && <CartesianGrid strokeDasharray="3 3" />}
                {!compact && (
                  <XAxis
                    dataKey={yAxis}
                    angle={-35}
                    textAnchor="end"
                    height={Math.sqrt(longestLabelLength) * 25}
                  />
                )}
                {!compact && <YAxis />}
                {!compact && <ReferenceLine y={0} stroke="#000" />}
                <Bar dataKey={val => getVal(val)} stackId="a">
                  {data[splitData]
                    .filter(i => (!empty ? i[typeOp] !== 0 : true))
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          yAxis === 'date'
                            ? typeOp === 'totalDebts'
                              ? theme.reportsRed
                              : theme.reportsBlue
                            : colorScale[index % colorScale.length]
                        }
                        name={entry[yAxis]}
                      />
                    ))}
                </Bar>
                {yAxis === 'date' && typeOp === 'totalTotals' && (
                  <Bar dataKey={'totalDebts'} stackId="a">
                    {data[splitData]
                      .filter(i => (!empty ? i[typeOp] !== 0 : true))
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={theme.reportsRed}
                          name={entry.name}
                        />
                      ))}
                  </Bar>
                )}
              </BarChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default BarGraph;
