import React from 'react';

import {
  VictoryChart,
  VictoryBar,
  VictoryStack,
  VictoryLabel,
  VictoryLegend,
  VictoryAxis,
} from 'victory';

import Container from '../Container';

type StackedBarGraphProps = {
  graphData: { start; end; expenses; income; balances; labels; datasets };
  isConcise: boolean;
};
function StackedBarGraph({ graphData, isConcise }: StackedBarGraphProps) {
  return (
    <Container style={{ height: 500 }}>
      {(width, height, portalHost) =>
        graphData && (
          <VictoryChart
            height={500}
            width={600}
            domain={{ x: [0, 5], y: [0, 100000] }}
            domainPadding={{ x: 30, y: 20 }}
          >
            <VictoryLegend
              x={280}
              y={0}
              gutter={50}
              style={{ title: { fontSize: 20 } }}
              data={graphData.labels}
              colorScale="qualitative"
            />
            <VictoryStack colorScale="qualitative">
              {graphData.datasets.map((data, i) => {
                return (
                  <VictoryBar
                    barWidth={20}
                    data={data}
                    key={i}
                    labelComponent={
                      <VictoryLabel y={250} verticalAnchor={graphData.start} />
                    }
                  />
                );
              })}
            </VictoryStack>
            <VictoryAxis dependentAxis />
            <VictoryAxis
              padding={{ left: 80, right: 60 }}
              axisLabelComponent={<VictoryLabel angle={20} />}
              tickFormat={['Jan', 'Feb', 'Mar', 'Apr', 'May']}
            />
          </VictoryChart>
        )
      }
    </Container>
  );
}

export default StackedBarGraph;
