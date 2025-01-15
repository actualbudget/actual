import React, { type CSSProperties } from 'react';

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
        fontSize="11"
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

type SankeyGraphType = {
  style?: CSSProperties;
  data: Sankey['props']['data'];
  compact?: boolean;
  showTooltip?: boolean;
};
export function SankeyGraph({
  style,
  data,
  compact = false,
  showTooltip = true,
}: SankeyGraphType) {
  const sankeyData = compact ? convertToCondensed(data) : data;

  if (!data.links || data.links.length === 0) return null;

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) => (
        <ResponsiveContainer>
          <Sankey
            data={sankeyData}
            node={props => <SankeyNode {...props} containerWidth={width} />}
            link={{
              stroke: theme.reportsGray,
            }}
            sort
            iterations={1000}
            nodePadding={23}
            width={width}
            height={height}
            margin={{
              left: 0,
              right: 0,
              top: compact ? 0 : 10,
              bottom: compact ? 0 : 25,
            }}
          >
            {showTooltip && (
              <Tooltip
                formatter={numberFormatterTooltip}
                isAnimationActive={false}
                separator=": "
              />
            )}
          </Sankey>
        </ResponsiveContainer>
      )}
    </Container>
  );
}
