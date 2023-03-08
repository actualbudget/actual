import React from 'react';

import * as d from 'date-fns';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryVoronoiContainer,
} from 'victory';

import theme from '../chart-theme';
import Container from '../Container';
import Tooltip from '../Tooltip';

function Area({ start, end, scale, range }) {
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

function LineGraph({ style, start, end, graphData, isConcise, hasNegative }) {
  return (
    <Container>
      {(width, height, portalHost) =>
        graphData && (
          <VictoryChart
            scale={{ x: 'time', y: 'linear' }}
            theme={theme}
            domainPadding={{ x: 0, y: 10 }}
            width={width}
            height={height}
            containerComponent={
              <VictoryVoronoiContainer voronoiDimension="x" />
            }
          >
            <Area start={start} end={end} />
            <VictoryArea
              data={graphData.balances}
              labelComponent={<Tooltip portalHost={portalHost} />}
              labels={x => x.premadeLabel}
              style={{
                data: {
                  clipPath: 'url(#positive)',
                  fill: 'url(#positive-gradient)',
                },
              }}
            />
            <VictoryArea
              data={graphData.balances}
              style={{
                data: {
                  clipPath: 'url(#negative)',
                  fill: 'url(#negative-gradient)',
                  stroke: theme.colors.red,
                  strokeLinejoin: 'round',
                },
              }}
            />
            <VictoryArea
              data={graphData.balances}
              style={{ data: { fill: 'none', stroke: 'none' } }}
            />
            <VictoryAxis
              tickFormat={x => d.format(x, "MMM ''yy")}
              tickValues={graphData.balances.map(item => item.x)}
              tickCount={Math.min(5, graphData.balances.length)}
              offsetY={50}
            />
            <VictoryAxis dependentAxis crossAxis={false} />
          </VictoryChart>
        )
      }
    </Container>
  );
}

export default LineGraph;
