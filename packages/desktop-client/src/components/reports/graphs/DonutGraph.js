import React from 'react';

import { VictoryPie, VictoryTooltip } from 'victory';

import theme from '../chart-theme';
import Container from '../Container';

function DonutGraph({ style, start, end, graphData }) {
  return (
    <Container style={{ height: 500 }}>
      {(width, height, portalHost) =>
        graphData && (
          <VictoryPie
            data={graphData}
            theme={theme}
            labelComponent={
              <VictoryTooltip
                flyoutPadding={({ text }) =>
                  text.length > 1 ? { top: 0, bottom: 0, left: 7, right: 7 } : 7
                }
              />
            }
            labels={({ datum }) => `${datum.y}`}
            colorScale="qualitative"
            innerRadius={95}
          />
        )
      }
    </Container>
  );
}

export default DonutGraph;
