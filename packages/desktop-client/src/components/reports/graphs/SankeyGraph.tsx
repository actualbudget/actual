import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import { t } from 'i18next';
import {
  Layer,
  Rectangle,
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from 'recharts';
import type { SankeyData } from 'recharts/types/chart/Sankey';

import { Container } from '@desktop-client/components/reports/Container';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

const BUDGET_NODE_NAME = 'Available Funds';

type SankeyTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: {
      source?: SankeyGraphNode;
      target?: SankeyGraphNode;
      value?: number;
      name?: string;
    };
    value?: number;
    name?: string;
  }>;
};

function SankeyCustomTooltip({ active, payload }: SankeyTooltipProps) {
  const format = useFormat();

  if (!active || !payload?.length) return null;

  const { value = 0, name = '' } = payload[0];

  return (
    <div
      className={css({
        zIndex: 1000,
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      })}
    >
      <div style={{ lineHeight: 1.5 }}>
        {name && <div style={{ marginBottom: 5 }}>{name}</div>}
        <div>{format(value, 'financial')}</div>
      </div>
    </div>
  );
}

type SankeyGraphNode = SankeyData['nodes'][number] & {
  hasChildren?: boolean;
  isCollapsed?: boolean;
  toBudget?: number;
  nodeType?: 'income' | 'expense' | 'budget';
  isNegative?: boolean;
  actualValue?: number;
  targetLinks?: Array<Record<string, unknown>>;
  sourceLinks?: Array<Record<string, unknown>>;
};

type SankeyLinkProps = {
  sourceX: number;
  sourceY: number;
  sourceControlX: number;
  targetX: number;
  targetY: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
  payload: {
    source: SankeyGraphNode;
    target: SankeyGraphNode;
    value: number;
    isNegative?: boolean;
  };
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function SankeyLink({
  sourceX,
  sourceY,
  sourceControlX,
  targetX,
  targetY,
  targetControlX,
  linkWidth,
  payload,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: SankeyLinkProps) {
  const linkColor = payload.isNegative ? theme.errorText : theme.reportsGray;
  const strokeWidth = isHovered ? linkWidth + 2 : linkWidth;
  const strokeOpacity = isHovered ? 1 : 0.5;

  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={linkColor}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      cursor="default"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ transition: 'stroke-opacity 0.2s ease' }}
    />
  );
}

type SankeyNodeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: SankeyGraphNode;
  containerWidth: number;
  currencyCode: string;
};
function SankeyNode({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth,
}: SankeyNodeProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const isOut = x + width + 6 > containerWidth;

  const fillColor = payload.isNegative ? theme.errorText : theme.reportsBlue;
  const displayValue =
    payload.actualValue !== undefined
      ? Math.abs(payload.actualValue)
      : payload.value;

  const isBudgetNode = payload.name === BUDGET_NODE_NAME;
  const hasToBudget = isBudgetNode && payload.toBudget && payload.toBudget > 0;

  const renderText = (
    text: string,
    yOffset: number,
    fontSize = 13,
    opacity = 1,
  ) => (
    <text
      textAnchor={isOut ? 'end' : 'start'}
      x={isOut ? x - 6 : x + width + 6}
      y={y + yOffset}
      fontSize={fontSize}
      strokeOpacity={opacity}
      fill={theme.pageText}
      fontFamily={privacyMode ? t('Redacted Script') : undefined}
    >
      {text}
    </text>
  );

  if (hasToBudget) {
    const totalValue = payload.value;
    const allocatedValue = totalValue - (payload.toBudget || 0);
    const allocatedRatio = allocatedValue / totalValue;
    const allocatedHeight = height * allocatedRatio;
    const unallocatedHeight = height - allocatedHeight;
    const toBudgetLabelY = y + allocatedHeight + unallocatedHeight / 2;

    return (
      <Layer key={`CustomNode${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={allocatedHeight}
          fill={fillColor}
        />
        <Rectangle
          x={x}
          y={y + allocatedHeight}
          width={width}
          height={unallocatedHeight}
          fill={theme.warningText}
          fillOpacity={0.5}
        />
        {renderText(t('Budgeted'), allocatedHeight / 2)}
        {renderText(
          format(allocatedValue, 'financial'),
          allocatedHeight / 2 + 13,
          11,
          0.5,
        )}
        {renderText(t('To Budget'), toBudgetLabelY - y)}
        {renderText(
          format(payload.toBudget, 'financial'),
          toBudgetLabelY - y + 13,
          11,
          1,
        )}
      </Layer>
    );
  }

  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={fillColor} />
      {renderText(payload.name || '', height / 2)}
      {renderText(format(displayValue, 'financial'), height / 2 + 13, 11, 0.5)}
    </Layer>
  );
}

function convertToCondensed(data: SankeyData) {
  const budgetNodeIndex = data.nodes.findIndex(
    node => node.name === BUDGET_NODE_NAME,
  );

  const totalIncome = data.links.reduce(
    (acc, link) => (link.target === budgetNodeIndex ? acc + link.value : acc),
    0,
  );

  const totalExpenses = data.links.reduce(
    (acc, link) => (link.source === budgetNodeIndex ? acc + link.value : acc),
    0,
  );

  return {
    nodes: [
      { name: 'Income' },
      { name: BUDGET_NODE_NAME },
      { name: 'Expenses' },
    ],
    links: [
      { source: 0, target: 1, value: totalIncome },
      { source: 1, target: 2, value: totalExpenses },
    ],
  };
}

type SankeyGraphProps = {
  style?: CSSProperties;
  data: SankeyData;
  compact?: boolean;
  showTooltip?: boolean;
  collapsedNodes?: string[];
};
export function SankeyGraph({
  style,
  data,
  compact = false,
  showTooltip = true,
  collapsedNodes = [],
}: SankeyGraphProps) {
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');
  const currencyCode = defaultCurrencyCode || 'USD';
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);

  const collapsedSet = useMemo(() => new Set(collapsedNodes), [collapsedNodes]);
  const sankeyData = useMemo(() => {
    if (compact) return convertToCondensed(data);
    return collapseSankeyBranches(data, collapsedSet);
  }, [compact, data, collapsedSet]);

  if (!sankeyData.links?.length) return null;

  return (
    <Container style={{ ...style, ...(compact && { height: 'auto' }) }}>
      {(width, height) => (
        <ResponsiveContainer>
          <Sankey
            data={sankeyData}
            node={props => (
              <SankeyNode
                {...props}
                containerWidth={width}
                currencyCode={currencyCode}
              />
            )}
            link={props => (
              <SankeyLink
                {...props}
                isHovered={hoveredLinkIndex === props.index}
                onMouseEnter={() => setHoveredLinkIndex(props.index)}
                onMouseLeave={() => setHoveredLinkIndex(null)}
              />
            )}
            sort={true}
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
                content={<SankeyCustomTooltip />}
                isAnimationActive={false}
              />
            )}
          </Sankey>
        </ResponsiveContainer>
      )}
    </Container>
  );
}

function collapseSankeyBranches(
  data: SankeyData,
  collapsedNodes: Set<string>,
): SankeyData {
  const nameToIndex = new Map<string, number>();
  data.nodes.forEach((node, index) => {
    if (typeof node.name === 'string') {
      nameToIndex.set(node.name, index);
    }
  });

  // Build map of parent to children based on links
  const childrenByParent = new Map<number, Set<number>>();
  data.links.forEach(link => {
    const sourceIndex = normalizeIndex(link.source, nameToIndex);
    const targetIndex = normalizeIndex(link.target, nameToIndex);
    if (sourceIndex !== null && targetIndex !== null) {
      if (!childrenByParent.has(sourceIndex)) {
        childrenByParent.set(sourceIndex, new Set());
      }
      childrenByParent.get(sourceIndex)!.add(targetIndex);
    }
  });

  // Find collapsed parent indexes
  const collapsedIndexes = new Set<number>();
  collapsedNodes.forEach(name => {
    const index = nameToIndex.get(name);
    if (index !== undefined && data.nodes[index]?.name !== BUDGET_NODE_NAME) {
      collapsedIndexes.add(index);
    }
  });

  // Find all children of collapsed parents (recursively)
  const hiddenIndexes = new Set<number>();
  const findAllChildren = (parentIndex: number) => {
    const children = childrenByParent.get(parentIndex);
    if (children) {
      children.forEach(childIndex => {
        hiddenIndexes.add(childIndex);
        findAllChildren(childIndex);
      });
    }
  };
  collapsedIndexes.forEach(index => findAllChildren(index));

  // Filter links that involve hidden children
  const filteredLinks = data.links.filter(link => {
    const sourceIndex = normalizeIndex(link.source, nameToIndex);
    const targetIndex = normalizeIndex(link.target, nameToIndex);
    if (sourceIndex === null || targetIndex === null) {
      return false;
    }
    return !hiddenIndexes.has(sourceIndex) && !hiddenIndexes.has(targetIndex);
  });

  // Determine which nodes to keep
  const usedIndexes = new Set<number>();
  filteredLinks.forEach(link => {
    const sourceIndex = normalizeIndex(link.source, nameToIndex);
    const targetIndex = normalizeIndex(link.target, nameToIndex);
    if (sourceIndex !== null) usedIndexes.add(sourceIndex);
    if (targetIndex !== null) usedIndexes.add(targetIndex);
  });

  // Always include Available Funds node
  const budgetIndex = nameToIndex.get(BUDGET_NODE_NAME);
  if (budgetIndex !== undefined) {
    usedIndexes.add(budgetIndex);
  }

  // Build new node list
  const nodesWithIndex = data.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ index }) => usedIndexes.has(index));

  const indexMap = new Map<number, number>();
  const nodes = nodesWithIndex.map(({ node, index }, newIndex) => {
    indexMap.set(index, newIndex);
    return {
      ...node,
      hasChildren:
        childrenByParent.has(index) && childrenByParent.get(index)!.size > 0,
      isCollapsed: collapsedIndexes.has(index),
    };
  });

  // Remap links
  const links = filteredLinks
    .map(link => {
      const sourceIndex = normalizeIndex(link.source, nameToIndex);
      const targetIndex = normalizeIndex(link.target, nameToIndex);
      if (sourceIndex === null || targetIndex === null) {
        return null;
      }
      const mappedSource = indexMap.get(sourceIndex);
      const mappedTarget = indexMap.get(targetIndex);
      if (mappedSource === undefined || mappedTarget === undefined) {
        return null;
      }
      return {
        ...link,
        source: mappedSource,
        target: mappedTarget,
      };
    })
    .filter((link): link is SankeyData['links'][number] => link !== null);

  return { nodes, links };
}

function normalizeIndex(
  value: number | string,
  nameToIndex: Map<string, number>,
): number | null {
  if (typeof value === 'number') {
    return value;
  }
  const index = nameToIndex.get(value);
  return index ?? null;
}
