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

function BarGraph({
  style,
  start,
  end,
  graphDataExp,
  graphDataInc,
  selectList,
}) {
  return (
    <Container>
      {(width, height, portalHost) =>
        graphDataExp && (
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
                data={graphDataExp}
                labelComponent={<Tooltip portalHost={portalHost} />}
                labels={x => x.premadeLabel}
                style={{
                  data: {
                    fill:
                      selectList === 'Income'
                        ? theme.colors.blue
                        : theme.colors.red,
                  },
                }}
              />
              {selectList === 'All' && <VictoryBar data={graphDataInc} />}
            </VictoryGroup>
            <VictoryAxis
              tickFormat={x => d.format(x, "MMM ''yy")}
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
