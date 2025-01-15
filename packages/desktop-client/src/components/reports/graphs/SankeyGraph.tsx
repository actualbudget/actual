import React from 'react';

import {
  Sankey,
  Tooltip,
  Rectangle,
  Layer,
  ResponsiveContainer,
} from 'recharts';

import { usePrivacyMode } from '../../../hooks/usePrivacyMode';
import { theme } from '../../../style';
import { Container } from '../Container';
import { numberFormatterTooltip } from '../numberFormatter';

function SankeyNode({ x, y, width, height, index, payload, containerWidth }) {
  const privacyMode = usePrivacyMode();
  const isOut = x + width + 6 > containerWidth;
  let payloadValue = Math.round(payload.value / 1000).toString();
  if (payload.value < 1000) {
    payloadValue = '<1k';
  } else {
    payloadValue = payloadValue + 'k';
  }
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={theme.reportsBlue}
        fillOpacity="1"
      />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="13"
        fill={theme.pageText}
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize="9"
        strokeOpacity="0.5"
        fill={theme.pageText}
        {...(privacyMode && { fontFamily: 'Redacted Script' })}
      >
        {payloadValue}
      </text>
    </Layer>
  );
}

function convertToCondensed(data) {
  const budgetNodeIndex = data.nodes.findIndex(node => node.name === 'Budget');

  // Calculate total income (links going into the "Budget" node)
  const totalIncome = data.links.reduce((acc, link) => {
    return link.target === budgetNodeIndex ? acc + link.value : acc;
  }, 0);

  // Calculate total expenses (links going out of the "Budget" node)
  const totalExpenses = data.links.reduce((acc, link) => {
    return link.source === budgetNodeIndex ? acc + link.value : acc;
  }, 0);

  return {
    nodes: [{ name: 'Income' }, { name: 'Budget' }, { name: 'Expenses' }],
    links: [
      { source: 0, target: 1, value: totalIncome },
      { source: 1, target: 2, value: totalExpenses },
    ],
  };
}

type ComponentType = {
  data: Sankey['props']['data'];
  containerWidth?: number;
  compact?: boolean;
};
function Component({ compact = false, containerWidth, data }: ComponentType) {
  return (
    <ResponsiveContainer>
      <Sankey
        data={data}
        node={props => (
          <SankeyNode {...props} containerWidth={containerWidth} />
        )}
        link={{
          stroke: theme.reportsGray,
        }}
        sort
        iterations={1000}
        nodePadding={23}
        margin={{
          left: 0,
          right: 0,
          top: compact ? 0 : 10,
          bottom: compact ? 0 : 25,
        }}
      >
        <Tooltip
          formatter={numberFormatterTooltip}
          isAnimationActive={false}
          separator=": "
        />
      </Sankey>
    </ResponsiveContainer>
  );
}

export function SankeyGraph({ style, data, compact }) {
  const sankeyData = compact ? convertToCondensed(data) : data;

  if (!data.links || data.links.length === 0) return null;

  return compact ? (
    <Component data={sankeyData} compact />
  ) : (
    <Container
      style={{
        ...style,
      }}
    >
      {width => <Component data={sankeyData} containerWidth={width} />}
    </Container>
  );
}
