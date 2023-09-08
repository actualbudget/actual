import React from 'react';

import * as d from 'date-fns';
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryGroup,
} from 'victory';

import theme from '../chart-theme';
import Container from '../Container';
import Tooltip from '../Tooltip';

type BarGraphProps = {
  graphData: { expenses; income; balances; selectList };
  isConcise: boolean;
};
function BarGraph({ graphData, isConcise }: BarGraphProps) {
  return (
    <Container>
      {(width, height, portalHost) =>
        graphData.expenses && (
          <VictoryChart
            scale={{ x: 'time', y: 'linear' }}
            theme={theme}
            domainPadding={50}
            width={width}
            height={height}
            containerComponent={
              <VictoryVoronoiContainer voronoiDimension="x" />
            }
          >
            <VictoryGroup>
              <VictoryBar
                data={graphData.expenses}
                labelComponent={<Tooltip portalHost={portalHost} />}
                labels={x => x.premadeLabel}
                style={{
                  data: {
                    fill:
                      graphData.selectList === 'Income'
                        ? theme.colors.blue
                        : theme.colors.red,
                  },
                }}
              />
              {graphData.selectList === 'All' && (
                <VictoryBar data={graphData.income} />
              )}
            </VictoryGroup>

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

export default BarGraph;
