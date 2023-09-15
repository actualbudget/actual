import React, { createElement } from 'react';

import * as d from 'date-fns';
import {
  VictoryChart,
  VictoryBar,
  VictoryArea,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryGroup,
} from 'victory';

import { type CSSProperties } from '../../../style';
import { chartTheme } from '../chart-theme';
import Container from '../Container';
import Tooltip from '../Tooltip';

import { Area } from './common';

type NetWorthGraphProps = {
  style?: CSSProperties;
  graphData;
  compact: boolean;
};
function NetWorthGraph({ style, graphData, compact }: NetWorthGraphProps) {
  const Chart = compact ? VictoryGroup : VictoryChart;

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
        graphData && (
          <Chart
            scale={{ x: 'time', y: 'linear' }}
            theme={chartTheme}
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
                right: 0,
              }
            }
          >
            <Area start={graphData.start} end={graphData.end} />
            {createElement(
              // @ts-expect-error defaultProps mismatch causing issue
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
                          fill: 'url(#positive-gradient)',
                        },
                },
              },
            )}
            {graphData.data.length > 1 && (
              <VictoryArea
                data={graphData.data}
                style={{
                  data: {
                    clipPath: 'url(#negative)',
                    fill: 'url(#negative-gradient)',
                    stroke: chartTheme.colors.red,
                    strokeLinejoin: 'round',
                  },
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
                style={{ ticks: { stroke: chartTheme.colors.red } }}
                // eslint-disable-next-line rulesdir/typography
                tickFormat={x => d.format(x, "MMM ''yy")}
                tickValues={graphData.data.map(item => item.x)}
                tickCount={Math.min(width / 220, graphData.data.length)}
                offsetY={50}
              />
            )}
            {!compact && (
              <VictoryAxis
                dependentAxis
                tickCount={Math.round(height / 70)}
                crossAxis={!graphData.hasNegative}
              />
            )}
          </Chart>
        )
      }
    </Container>
  );
}

export default NetWorthGraph;
