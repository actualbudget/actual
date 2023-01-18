import React from 'react';

import * as d from 'date-fns';
import {
  VictoryChart,
  VictoryBar,
  VictoryLine,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryGroup
} from 'victory';

import { colors } from 'loot-design/src/style';

import theme from '../chart-theme';
import Container from '../Container';
import Tooltip from '../Tooltip';

function CashFlowGraph({ style, start, end, graphData, isConcise, compact }) {
  return (
    <Container>
      {(width, height, portalHost) =>
        graphData && (
          <VictoryChart
            scale={{ x: 'time', y: 'linear' }}
            theme={theme}
            domainPadding={10}
            width={width}
            height={height}
            containerComponent={
              <VictoryVoronoiContainer voronoiDimension="x" />
            }
          >
            <VictoryGroup>
              <VictoryBar
                data={graphData.expenses}
                style={{ data: { fill: theme.colors.red } }}
              />
              <VictoryBar data={graphData.income} />
            </VictoryGroup>
            <VictoryLine
              data={graphData.balances}
              labelComponent={<Tooltip portalHost={portalHost} />}
              labels={x => x.premadeLabel}
              style={{
                data: { stroke: colors.n5 }
              }}
            />
            <VictoryAxis
              tickFormat={x => d.format(x, isConcise ? "MMM ''yy" : 'MMM d')}
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

export default CashFlowGraph;
