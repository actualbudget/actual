import React from 'react';

import { VictoryLabel, VictoryPie, VictoryTooltip } from 'victory';

import theme from '../chart-theme';

function DonutGraph({ style, start, end, graphData }) {
  return (
    graphData && (
      <svg viewBox="0 0 600 325">
        <VictoryPie
          standalone={false}
          width={350}
          height={350}
          labelPosition="centroid"
          labelPlacement="parallel"
          labelRadius={100}
          data={graphData}
          theme={theme}
          colorScale={theme.pie.colorScale}
          innerRadius={80}
          labelComponent={<VictoryLabel textAnchor="middle" />}
          labels={({ datum }) => `${datum.x}`}
        />
        <VictoryPie
          standalone={false}
          width={350}
          height={350}
          data={graphData}
          theme={theme}
          labelComponent={
            <VictoryTooltip
              cornerRadius={2}
              orientation="right"
              flyoutPadding={({ text }) =>
                text.length > 1 ? { top: 0, bottom: 0, left: 10, right: 10 } : 7
              }
            />
          }
          labels={({ datum }) => `${datum.x}: ${datum.q}`}
          innerRadius={80}
          style={{
            data: { fillOpacity: 0.0 },
            parent: { border: '0px solid #ccc' },
          }}
        />
      </svg>
    )
  );
}

export default DonutGraph;
