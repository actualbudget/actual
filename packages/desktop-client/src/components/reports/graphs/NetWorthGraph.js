import React from 'react';

import * as d from 'date-fns';
import {
  VictoryChart,
  VictoryBar,
  VictoryArea,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryGroup
} from 'victory';

import theme from '../chart-theme';
import Container from '../Container';
import Tooltip from '../Tooltip';

function Area({ start, end, data, style, scale, range }) {
  const zero = scale.y(0);

  const startX = scale.x(d.parseISO(start + '-01'));
  const endX = scale.x(d.parseISO(end + '-01'));

  if (startX < 0 || endX < 0) {
    return null;
  }

  return (
    <svg>
      <defs>
        <clipPath id="positive">
          <rect
            x={startX}
            y={range.y[1]}
            width={endX - startX}
            height={zero - range.y[1] + 1}
            fill="#ffffff"
          />
        </clipPath>
        <clipPath id="negative">
          <rect
            x={startX}
            y={zero + 1}
            width={endX - startX}
            height={Math.max(range.y[0] - zero - 1, 0)}
            fill="#ffffff"
          />
        </clipPath>
        <linearGradient
          id="positive-gradient"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={range.y[1]}
          x2={0}
          y2={zero}
        >
          <stop offset="0%" stopColor={theme.colors.blueFadeStart} />
          <stop offset="100%" stopColor={theme.colors.blueFadeEnd} />
        </linearGradient>
        <linearGradient
          id="negative-gradient"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={zero}
          x2={0}
          y2={range.y[0]}
        >
          <stop offset="0%" stopColor={theme.colors.redFadeEnd} />
          <stop offset="100%" stopColor={theme.colors.redFadeStart} />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NetWorthGraph({ style, start, end, graphData, compact }) {
  const Chart = compact ? VictoryGroup : VictoryChart;

  return (
    <Container style={[style, compact && { height: 'auto' }]}>
      {(width, height, portalHost) =>
        graphData && (
          <Chart
            scale={{ x: 'time', y: 'linear' }}
            theme={theme}
            domainPadding={{ x: 0, y: 10 }}
            width={width}
            height={height}
            containerComponent={
              <VictoryVoronoiContainer voronoiDimension="x" />
            }
            padding={
              compact && {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
              }
            }
          >
            <Area
              start={graphData.start}
              end={graphData.end}
              data={graphData.data}
            />
            {React.createElement(
              graphData.data.length === 1 ? VictoryBar : VictoryArea,
              {
                data: graphData.data,
                labelComponent: <Tooltip portalHost={portalHost} />,
                labels: x => x.premadeLabel,
                style: {
                  data:
                    graphData.data.length === 1
                      ? { width: 50 }
                      : {
                          clipPath: 'url(#positive)',
                          fill: 'url(#positive-gradient)'
                        }
                }
              }
            )}
            {graphData.data.length > 1 && (
              <VictoryArea
                data={graphData.data}
                style={{
                  data: {
                    clipPath: 'url(#negative)',
                    fill: 'url(#negative-gradient)',
                    stroke: theme.colors.red,
                    strokeLinejoin: 'round'
                  }
                }}
              />
            )}
            {/* Somehow the path `d` attributes are stripped from second
             `<VictoryArea />` above if this is removed. I’m just as
              confused as you are! */}
            <VictoryArea
              data={graphData.data}
              style={{ data: { fill: 'none', stroke: 'none' } }}
            />
            {!compact && (
              <VictoryAxis
                style={{ ticks: { stroke: 'red' } }}
                tickFormat={x => d.format(x, "MMM ''yy")}
                tickValues={graphData.data.map(item => item.x)}
                tickCount={Math.min(5, graphData.data.length)}
                offsetY={50}
              />
            )}
            {!compact && (
              <VictoryAxis dependentAxis crossAxis={!graphData.hasNegative} />
            )}
          </Chart>
        )
      }
    </Container>
  );
}

export default NetWorthGraph;
