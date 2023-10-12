import React from 'react';

import * as d from 'date-fns';
import {
  VictoryChart,
  VictoryBar,
  VictoryLine,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryGroup,
} from 'victory';

import { theme } from '../../../style';
import { chartTheme } from '../chart-theme';
import Container from '../Container';
import Tooltip from '../Tooltip';

type CashFlowGraphProps = {
  graphData: { expenses; income; balances };
  isConcise: boolean;
};
function CashFlowGraph({ graphData, isConcise }: CashFlowGraphProps) {
  return (
    <Container>
      {(width, height, portalHost) =>
        graphData && (
          <VictoryChart
            scale={{ x: 'time', y: 'linear' }}
            theme={chartTheme}
            domainPadding={10}
            width={width}
            height={height}
            containerComponent={
              <VictoryVoronoiContainer voronoiDimension="x" />
            }
          >
            <VictoryGroup>
              <VictoryBar data={graphData.expenses} />
              <VictoryBar data={graphData.income} />
            </VictoryGroup>
            <VictoryLine
              data={graphData.balances}
              labelComponent={<Tooltip portalHost={portalHost} />}
              labels={x => x.premadeLabel}
              style={{
                data: { stroke: theme.altpageTextSubdued },
              }}
            />
            <VictoryAxis
              // eslint-disable-next-line rulesdir/typography
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
