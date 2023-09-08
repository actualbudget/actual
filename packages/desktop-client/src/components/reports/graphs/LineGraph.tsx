import React from 'react';

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
import theme from '../chart-theme';
import Container from '../Container';
import Tooltip from '../Tooltip';

import { Area } from './common';

type LineGraphProps = {
  style?: CSSProperties;
  graphData;
  compact: boolean;
};
function LineGraph({ style, graphData, compact }: LineGraphProps) {
  const Chart = compact ? VictoryGroup : VictoryChart;

  return (
    <Container>
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
          >
            <Area start={graphData.start} end={graphData.end} />
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
              tickFormat={x => d.format(x, 'MMM yy')}
              tickValues={graphData.balances.map(item => item.x)}
              tickCount={Math.min(5, graphData.balances.length)}
              offsetY={50}
            />
            <VictoryAxis dependentAxis crossAxis={false} />
          </Chart>
        )
      }
    </Container>
  );
}

export default LineGraph;
