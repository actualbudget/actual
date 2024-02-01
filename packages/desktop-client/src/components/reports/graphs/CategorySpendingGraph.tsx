import type { CSSProperties } from 'react';

import * as d from 'date-fns';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryStack } from 'victory';

import { chartTheme } from '../chart-theme';
import { Container } from '../Container';
import { type CategorySpendingGraphData } from '../spreadsheets/category-spending-spreadsheet';
import { Tooltip } from '../Tooltip';

import { Area } from './common';

type CategorySpendingGraphProps = {
  start: string;
  end: string;
  graphData: CategorySpendingGraphData;
  compact?: boolean;
  style?: CSSProperties;
};
export function CategorySpendingGraph({
  style,
  start,
  end,
  graphData,
  compact,
}: CategorySpendingGraphProps) {
  if (!graphData || !graphData.data) {
    return;
  }

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto', flex: 1 }),
      }}
    >
      {(width, height, portalHost) => (
        <VictoryChart
          scale={{ x: 'time', y: 'linear' }}
          theme={chartTheme}
          width={width}
          height={height}
        >
          <Area start={start} end={end} />
          <VictoryStack
            colorScale="qualitative"
            domainPadding={{ x: compact ? 5 : 15 }}
          >
            {graphData.categories.map(category => (
              <VictoryBar
                key={category.id}
                data={graphData.data[category.id]}
                labelComponent={
                  !compact ? <Tooltip portalHost={portalHost} /> : undefined
                }
                labels={item => item.premadeLabel}
              />
            ))}
          </VictoryStack>
          {!compact && (
            <VictoryAxis
              style={{ ticks: { stroke: 'red' } }}
              // eslint-disable-next-line rulesdir/typography
              tickFormat={x => d.format(x, "MMM ''yy")}
              tickValues={graphData.tickValues}
              tickCount={Math.max(
                1,
                Math.min(width > 760 ? 12 : 5, graphData.tickValues.length),
              )}
              offsetY={50}
              orientation="bottom"
            />
          )}
          <VictoryAxis
            dependentAxis
            crossAxis={false}
            invertAxis
            tickCount={compact ? 2 : height / 70}
          />
        </VictoryChart>
      )}
    </Container>
  );
}
