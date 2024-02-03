// @ts-strict-ignore
import React from 'react';

import {
  Sankey,
  Tooltip,
  Rectangle,
  Layer,
  ResponsiveContainer,
} from 'recharts';

import { Container } from '../Container';
import { numberFormatterTooltip } from '../numberFormatter';

type SankeyProps = {
  style;
  data;
  compact: boolean;
};

function SankeyNode({ x, y, width, height, index, payload, containerWidth }) {
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
        fill="#5192ca"
        fillOpacity="1"
      />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="13"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize="9"
        strokeOpacity="0.5"
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

export function SankeyGraph({ style, data, compact }: SankeyProps) {
  const sankeyData = compact ? convertToCondensed(data) : data;

  if (!data.links || data.links.length === 0) return null;
  const margin = {
    left: 0,
    right: 0,
    top: compact ? 0 : 10,
    bottom: compact ? 0 : 25,
  };

  return compact ? (
    <ResponsiveContainer>
      <Sankey
        data={sankeyData}
        node={props => <SankeyNode {...props} />}
        sort={true}
        iterations={1000}
        nodePadding={23}
        margin={margin}
      >
        <Tooltip
          formatter={numberFormatterTooltip}
          isAnimationActive={false}
          separator=": "
        />
      </Sankey>
    </ResponsiveContainer>
  ) : (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {width => (
        <ResponsiveContainer>
          <Sankey
            data={sankeyData}
            node={props => <SankeyNode {...props} containerWidth={width} />}
            sort={true}
            iterations={1000}
            nodePadding={23}
            margin={margin}
          >
            <Tooltip
              formatter={numberFormatterTooltip}
              isAnimationActive={false}
              separator=": "
            />
          </Sankey>
        </ResponsiveContainer>
      )}
    </Container>
  );
}
