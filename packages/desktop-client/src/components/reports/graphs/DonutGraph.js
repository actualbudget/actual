import React from 'react';

import { VictoryPie, VictoryTooltip } from 'victory';

//import theme from '../chart-theme';
import Container from '../Container';

function DonutGraph({ style, start, end, graphData }) {
  return (
    <Container style={{ height: 500 }}>
      {(width, height, portalHost) =>
        graphData && (
          <svg viewBox="0 0 400 400">
            <VictoryPie
              standalone={false}
              data={graphData}
              //theme={theme}
              colorScale="qualitative"
              innerRadius={100}
              style={{
                data: { fillOpacity: 1.0 },
                parent: { border: '0px solid #ccc' },
              }}
            />
            <VictoryPie
              standalone={false}
              data={graphData}
              //theme={theme}
              colorScale="qualitative"
              labelComponent={
                <VictoryTooltip
                  x={200}
                  y={250}
                  orientation="top"
                  pointerLength={0}
                  cornerRadius={50}
                  flyoutWidth={100}
                  flyoutHeight={100}
                  flyoutStyle={{
                    stroke: 'none',
                    //fill: props.color,
                  }}
                />
              }
              labels={({ datum }) => `${datum.y}`}
              innerRadius={100}
              labelRadius={110}
              style={{
                data: { fillOpacity: 0.0 },
                parent: { border: '0px solid #ccc' },
              }}
            />
          </svg>
        )
      }
    </Container>
  );
}

export default DonutGraph;
