import { useState } from 'react';
import type { CSSProperties } from 'react';

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

import { getColorScale } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

type SankeyGraphNode = SankeyData['nodes'][number] & {
  hasChildren?: boolean;
  isCollapsed?: boolean;
  toBudget?: number;
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
  color: string;
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
  color,
}: SankeyLinkProps) {
  const linkColor = payload.isNegative ? theme.errorText : color;
  const strokeWidth = linkWidth;
  const strokeOpacity = isHovered ? 1 : 0.6;

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
  containerHeight: number;
};
function SankeyNode({
  x,
  y,
  width,
  height,
  index: _index,
  payload,
  containerWidth,
  containerHeight,
}: SankeyNodeProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const isOut = x + width + 6 > containerWidth;

  const fillColor = payload.isNegative ? theme.errorText : theme.reportsBlue;

  const toBudget = payload.toBudget ?? 0;
  const availableBelow = Math.max(0, containerHeight - 25 - (y + height));
  const proportionalHeight =
    toBudget > 0 && payload.value ? height * (toBudget / payload.value) : 0;
  const isClamped = proportionalHeight > availableBelow;
  const toBudgetHeight = Math.min(proportionalHeight, availableBelow);

  const renderText = (
    text: string,
    yOffset: number,
    fontSize = 13,
    opacity = 1,
    fontFamily?: string,
    yBase = y,
  ) => (
    <text
      textAnchor={isOut ? 'end' : 'start'}
      x={isOut ? x - 6 : x + width + 6}
      y={yBase + yOffset}
      fontSize={fontSize}
      strokeOpacity={opacity}
      fill={theme.pageText}
      fontFamily={fontFamily}
    >
      {text}
    </text>
  );

  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={fillColor} />
      {toBudgetHeight > 0 &&
        (isClamped ? (
          <polygon
            points={`
              ${x},${y + height}
              ${x + width},${y + height}
              ${x + width},${y + height + toBudgetHeight - 8}
              ${x + width / 2},${y + height + toBudgetHeight}
              ${x},${y + height + toBudgetHeight - 8}
            `}
            fill={theme.toBudgetPositive}
          />
        ) : (
          <Rectangle
            x={x}
            y={y + height}
            width={width}
            height={toBudgetHeight}
            fill={theme.toBudgetPositive}
          />
        ))}
      {renderText(payload.name || '', height / 2)}
      {renderText(
        format(payload.value, 'financial'),
        height / 2 + 13,
        11,
        0.5,
        privacyMode ? t('Redacted Script') : undefined,
      )}
      {toBudgetHeight > 0 &&
        renderText(
          format(toBudget, 'financial'),
          toBudgetHeight / 2 + 13,
          11,
          0.5,
          privacyMode ? t('Redacted Script') : undefined,
          y + height,
        )}
      {toBudgetHeight > 0 &&
        renderText(
          t('To budget'),
          toBudgetHeight / 2,
          13,
          1,
          undefined,
          y + height,
        )}
    </Layer>
  );
}

type SankeyGraphProps = {
  style?: CSSProperties;
  data: SankeyData;
  showTooltip?: boolean;
  collapsedNodes?: string[];
};
export function SankeyGraph({
  style,
  data,
  showTooltip = true,
}: SankeyGraphProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);

  const colors = getColorScale('qualitative');
  const sourceColorMap = new Map(
    [
      ...new Set(
        data.links
          .filter(l => (l.source as number) !== 0)
          .map(l => data.nodes[l.source as number]?.name),
      ),
    ]
      .filter(Boolean)
      .map((name, i) => [name, colors[i % colors.length]]),
  );

  return (
    <Container style={style}>
      {(width, height) => (
        <ResponsiveContainer>
          <Sankey
            data={data}
            node={props => (
              <SankeyNode
                {...props}
                containerWidth={width}
                containerHeight={height}
              />
            )}
            link={props => (
              <SankeyLink
                {...props}
                isHovered={hoveredLinkIndex === props.index}
                onMouseEnter={() => setHoveredLinkIndex(props.index)}
                onMouseLeave={() => setHoveredLinkIndex(null)}
                color={
                  sourceColorMap.get(props.payload.source.name) ??
                  theme.reportsGray
                }
              />
            )}
            sort={false}
            iterations={1000}
            nodePadding={23}
            width={width}
            height={height}
            margin={{
              left: 0,
              right: 0,
              top: 10,
              bottom: 25,
            }}
          >
            {showTooltip && (
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const { value = 0, name = '' } = payload[0];
                  const tooltipInfo =
                    hoveredLinkIndex !== null
                      ? (
                          data.links[hoveredLinkIndex] as {
                            tooltipInfo?: Array<{
                              name: string;
                              value: number;
                            }>;
                          }
                        )?.tooltipInfo
                      : undefined;
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
                      <div style={{ lineHeight: 1.4 }}>
                        {name && <div style={{ marginBottom: 5 }}>{name}</div>}
                        <div
                          style={{
                            fontFamily: privacyMode
                              ? t('Redacted Script')
                              : undefined,
                          }}
                        >
                          {format(value, 'financial')}
                        </div>
                        {tooltipInfo && tooltipInfo.length > 0 && (
                          <div
                            style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}
                          >
                            {tooltipInfo.map(item => (
                              <div key={item.name}>
                                {item.name} (
                                <span
                                  style={{
                                    fontFamily: privacyMode
                                      ? t('Redacted Script')
                                      : undefined,
                                  }}
                                >
                                  {format(item.value, 'financial')}
                                </span>
                                )
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
                isAnimationActive={false}
              />
            )}
          </Sankey>
        </ResponsiveContainer>
      )}
    </Container>
  );
}
