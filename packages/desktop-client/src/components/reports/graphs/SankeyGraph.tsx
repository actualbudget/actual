import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

import { theme } from '@actual-app/components/theme';
import { css, keyframes } from '@emotion/css';
import { t } from 'i18next';
import {
  Layer,
  Rectangle,
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from 'recharts';
import type { SankeyData } from 'recharts/types/chart/Sankey';

import { Container } from '#components/reports/Container';
import { useIsDashboardCapturing } from '#components/reports/DashboardCaptureContext';
import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';
import { useReducedMotion } from '#hooks/useReducedMotion';

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

// kept invisible until the card scrolls into view
const hiddenClass = css({ opacity: 0 });

// stagger the load fade-in left-to-right, keyed off horizontal position
function fadeInClass(fraction: number) {
  const delay = Math.max(0, Math.min(1, fraction)) * 0.3;
  return css({
    animation: `${fadeIn} 0.3s ease-out ${delay}s both`,
  });
}

export type SankeyGraphNode = SankeyData['nodes'][number] & {
  value: number;
  percentageLabel?: string;
  key: string;
  color?: string;
  /** Extra line shown in the tooltip. */
  subtitle?: string;
};

/** Invoked when a node is activated; `rect` is the node's screen rectangle. */
export type SankeyNodeClickHandler = (
  node: SankeyGraphNode,
  rect: DOMRect,
) => void;

type SankeyLinkPayload = {
  source: SankeyGraphNode;
  target: SankeyGraphNode;
  value: number;
  color?: string;
};

type SankeyLinkProps = {
  sourceX: number;
  sourceY: number;
  sourceControlX: number;
  targetX: number;
  targetY: number;
  targetControlX: number;
  linkWidth: number;
  containerWidth: number;
  phase: 'waiting' | 'animating' | 'done';
  payload: SankeyLinkPayload;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  /** Clicking a flow zooms into the branch it leads to. */
  isClickable?: boolean;
  onClick?: () => void;
  /** Clicking a flow that leads to the end of the chart. */
  onLeafClick?: () => void;
};

function SankeyLink({
  sourceX,
  sourceY,
  sourceControlX,
  targetX,
  targetY,
  targetControlX,
  linkWidth,
  containerWidth,
  phase,
  payload,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  isClickable,
  onClick,
  onLeafClick,
}: SankeyLinkProps) {
  const reducedMotion = useReducedMotion();

  if (payload.value <= 0) {
    return null;
  }
  const linkColor = payload.color ?? theme.reportsGray;
  const strokeWidth = linkWidth;
  const strokeOpacity = isHovered ? 1 : 0.6;
  // use the link's midpoint so it eases in with the columns it spans
  const fraction = (sourceX + targetX) / 2 / containerWidth;

  return (
    <path
      className={
        reducedMotion || phase === 'done'
          ? undefined
          : phase === 'animating'
            ? fadeInClass(fraction)
            : hiddenClass
      }
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={linkColor}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      cursor={isClickable ? 'pointer' : 'default'}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={isClickable ? onClick : onLeafClick}
      data-sankey-link-target={payload.target?.key}
      style={{ transition: 'stroke-opacity 0.2s ease' }}
    />
  );
}

type SankeyNodeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: SankeyGraphNode;
  containerWidth: number;
  phase: 'waiting' | 'animating' | 'done';
  showPercentages?: boolean;
  color?: string;
  isClickable?: boolean;
  onClick?: SankeyNodeClickHandler;
  /** Invoked when a node that cannot be explored further is clicked. */
  onLeafClick?: (node: SankeyGraphNode) => void;
};
function SankeyNode({
  x,
  y,
  width,
  height,
  payload,
  containerWidth,
  phase,
  showPercentages,
  isClickable,
  onClick,
  onLeafClick,
}: SankeyNodeProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const reducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const rectRef = useRef<SVGGElement | null>(null);

  if (payload.value <= 0) {
    return null;
  }
  const isOut = x + width + 6 > containerWidth;

  const fillColor = payload.color ?? theme.reportsBlue;
  const isInteractive = isClickable || !!onLeafClick;
  const activate = () => {
    if (!isClickable || !onClick) {
      onLeafClick?.(payload);
      return;
    }
    const rect =
      rectRef.current?.getBoundingClientRect() ??
      new DOMRect(x, y, width, height);
    onClick(payload, rect);
  };

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
    <Layer
      className={
        reducedMotion || phase === 'done'
          ? undefined
          : phase === 'animating'
            ? fadeInClass(x / containerWidth)
            : hiddenClass
      }
      {...(isInteractive
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': isClickable
              ? t('Explore {{name}}', { name: payload.name })
              : payload.name,
            cursor: isClickable ? 'pointer' : 'default',
            onClick: activate,
            onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activate();
              }
            },
            onMouseEnter: () => setIsHovered(isClickable === true),
            onMouseLeave: () => setIsHovered(false),
            onFocus: () => setIsHovered(isClickable === true),
            onBlur: () => setIsHovered(false),
          }
        : {})}
      data-sankey-node={payload.key}
      data-clickable={isClickable ? 'true' : undefined}
    >
      <g ref={rectRef}>
        <Rectangle
          x={isHovered ? x - 1.5 : x}
          y={y}
          width={isHovered ? width + 3 : width}
          height={height}
          fill={fillColor}
          stroke={isHovered ? theme.pageText : undefined}
          strokeWidth={isHovered ? 1.5 : 0}
          style={{ transition: 'x 0.15s ease, width 0.15s ease' }}
        />
      </g>
      {renderText(payload.name || '', height / 2)}
      {renderText(
        showPercentages && payload.percentageLabel
          ? payload.percentageLabel
          : format(payload.value, 'financial'),
        height / 2 + 13,
        11,
        0.5,
        privacyMode ? t('Redacted Script') : undefined,
      )}
    </Layer>
  );
}

type SankeyGraphProps = {
  style?: CSSProperties;
  data: SankeyData;
  showTooltip?: boolean;
  showPercentages?: boolean;
  /**
   * Makes nodes interactive: called when a node is clicked (or activated
   * with the keyboard). `isNodeClickable` decides which nodes take part.
   */
  onNodeClick?: SankeyNodeClickHandler;
  isNodeClickable?: (node: SankeyGraphNode) => boolean;
  /** Hint shown in the tooltip of clickable nodes. */
  clickHint?: string;
  /**
   * Called when the user clicks a node (or the flow into a node) that cannot
   * be explored any further, i.e. the end of the chart.
   */
  onLeafClick?: (node: SankeyGraphNode) => void;
};
export function SankeyGraph({
  style,
  data,
  showTooltip = true,
  showPercentages = false,
  onNodeClick,
  isNodeClickable,
  clickHint,
  onLeafClick,
}: SankeyGraphProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);

  // play the load animation once: wait until the card scrolls into view,
  // run the fade-in, then stay in 'done' so later data changes (filters,
  // date range) don't re-animate the chart in place. the viewport element
  // is tracked as state because AutoSizer renders it on a later tick, so a
  // useRef-based observer would attach before the element exists.
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const isCapturing = useIsDashboardCapturing();
  const [phase, setPhase] = useState<'waiting' | 'animating' | 'done'>(
    isCapturing ? 'done' : 'waiting',
  );

  // An export capture needs the finished chart right away, wherever it is.
  useEffect(() => {
    if (isCapturing && phase !== 'done') {
      setPhase('done');
    }
  }, [isCapturing, phase]);

  useEffect(() => {
    if (!viewportEl || phase !== 'waiting') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPhase('animating');
        observer.disconnect();
      }
    });
    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, [viewportEl, phase]);

  useEffect(() => {
    if (phase !== 'animating') return;
    // 0.3s duration + 0.3s max stagger, plus buffer
    const timer = setTimeout(() => setPhase('done'), 700);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <Container style={style}>
      {(width, height) => (
        <div ref={setViewportEl} style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer>
            <Sankey
              data={data}
              node={props => (
                <SankeyNode
                  {...props}
                  containerWidth={width}
                  phase={phase}
                  showPercentages={showPercentages}
                  isClickable={
                    !!onNodeClick &&
                    (isNodeClickable
                      ? isNodeClickable(props.payload as SankeyGraphNode)
                      : true)
                  }
                  onClick={onNodeClick}
                  onLeafClick={onLeafClick}
                />
              )}
              link={props => {
                // A flow is part of the branch it leads to: clicking it
                // zooms into that branch, just like clicking the node.
                const target = props.payload?.target as
                  | SankeyGraphNode
                  | undefined;
                const isLinkClickable =
                  !!onNodeClick &&
                  !!target &&
                  (isNodeClickable ? isNodeClickable(target) : true);
                return (
                  <SankeyLink
                    {...props}
                    containerWidth={width}
                    phase={phase}
                    isHovered={hoveredLinkIndex === props.index}
                    onMouseEnter={() => setHoveredLinkIndex(props.index)}
                    onMouseLeave={() => setHoveredLinkIndex(null)}
                    isClickable={isLinkClickable}
                    onLeafClick={
                      onLeafClick && target
                        ? () => onLeafClick(target)
                        : undefined
                    }
                    onClick={() => {
                      if (!target || !onNodeClick) return;
                      const nodeElement = viewportEl?.querySelector(
                        `[data-sankey-node="${CSS.escape(target.key)}"] g`,
                      );
                      const rect =
                        nodeElement?.getBoundingClientRect() ??
                        new DOMRect(
                          props.targetX,
                          props.targetY - props.linkWidth / 2,
                          10,
                          props.linkWidth,
                        );
                      onNodeClick(target, rect);
                    }}
                  />
                );
              }}
              sort={false}
              iterations={128}
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
                    // Recharts wraps the hovered node in its tooltip entry
                    // (`{ payload, name, value }`), so unwrap it.
                    const entry = payload[0].payload as
                      | { payload?: unknown }
                      | undefined;
                    const hoveredNode =
                      hoveredLinkIndex === null
                        ? ((entry && typeof entry.payload === 'object'
                            ? entry.payload
                            : entry) as Partial<SankeyGraphNode> | undefined)
                        : undefined;
                    // Flows lead to their target node's branch.
                    const hoveredLinkTarget =
                      hoveredLinkIndex !== null
                        ? (data.nodes[
                            data.links[hoveredLinkIndex]?.target as number
                          ] as SankeyGraphNode | undefined)
                        : undefined;
                    const branchNode =
                      (hoveredNode as SankeyGraphNode | undefined) ??
                      hoveredLinkTarget;
                    const isHoveredNodeClickable =
                      !!branchNode &&
                      !!onNodeClick &&
                      (isNodeClickable ? isNodeClickable(branchNode) : true);
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
                          {name && (
                            <div style={{ marginBottom: 5 }}>{name}</div>
                          )}
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
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                opacity: 0.7,
                              }}
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
                          {hoveredNode?.subtitle && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                opacity: 0.7,
                              }}
                            >
                              {hoveredNode.subtitle}
                            </div>
                          )}
                          {isHoveredNodeClickable && clickHint && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                color: theme.pageTextLink,
                              }}
                            >
                              {clickHint}
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
        </div>
      )}
    </Container>
  );
}
