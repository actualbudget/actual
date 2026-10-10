import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { AlignedText } from '@actual-app/components/aligned-text';
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

import { FinancialText } from '#components/FinancialText';
import { Container } from '#components/reports/Container';
import type { SankeyNodeDrilldown } from '#components/reports/spreadsheets/sankey-spreadsheet';
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

type SankeyGraphNode = SankeyData['nodes'][number] & {
  value: number;
  percentageLabel?: string;
  key: string;
  color?: string;
  drilldown?: SankeyNodeDrilldown;
  inflow?: number;
  outflow?: number;
};

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
  onDrilldownClick?: (drilldowns: SankeyNodeDrilldown[]) => void;
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
  onDrilldownClick,
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
  // a link is drilldownable if either endpoint maps to a real entity -
  // e.g. a category -> account link filters by both, but a link into an
  // aggregated "Other" node still filters by whichever side is real
  const drilldowns = [
    payload.source.drilldown,
    payload.target.drilldown,
  ].filter((drilldown): drilldown is SankeyNodeDrilldown => Boolean(drilldown));
  const handleClick =
    onDrilldownClick && drilldowns.length > 0
      ? () => onDrilldownClick(drilldowns)
      : undefined;

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
      cursor={handleClick ? 'pointer' : 'default'}
      onClick={handleClick}
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
  payload: SankeyGraphNode;
  containerWidth: number;
  phase: 'waiting' | 'animating' | 'done';
  showPercentages?: boolean;
  color?: string;
  onDrilldownClick?: (drilldowns: SankeyNodeDrilldown[]) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
  onDrilldownClick,
  onMouseEnter,
  onMouseLeave,
}: SankeyNodeProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const reducedMotion = useReducedMotion();

  if (payload.value <= 0) {
    return null;
  }
  const isOut = x + width + 6 > containerWidth;
  const { drilldown } = payload;
  const handleClick =
    onDrilldownClick && drilldown
      ? () => onDrilldownClick([drilldown])
      : undefined;

  const fillColor = payload.color ?? theme.reportsBlue;

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
      cursor={handleClick ? 'pointer' : 'default'}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Rectangle x={x} y={y} width={width} height={height} fill={fillColor} />
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
  onDrilldownClick?: (drilldowns: SankeyNodeDrilldown[]) => void;
};
export function SankeyGraph({
  style,
  data,
  showTooltip = true,
  showPercentages = false,
  onDrilldownClick,
}: SankeyGraphProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const [hovered, setHovered] = useState<{
    type: 'node' | 'link';
    index: number;
  } | null>(null);

  // play the load animation once: wait until the card scrolls into view,
  // run the fade-in, then stay in 'done' so later data changes (filters,
  // date range) don't re-animate the chart in place. the viewport element
  // is tracked as state because AutoSizer renders it on a later tick, so a
  // useRef-based observer would attach before the element exists.
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<'waiting' | 'animating' | 'done'>(
    'waiting',
  );

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
                  onDrilldownClick={onDrilldownClick}
                  onMouseEnter={() =>
                    setHovered({ type: 'node', index: props.index })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
              )}
              link={props => (
                <SankeyLink
                  {...props}
                  containerWidth={width}
                  phase={phase}
                  isHovered={
                    hovered?.type === 'link' && hovered.index === props.index
                  }
                  onMouseEnter={() =>
                    setHovered({ type: 'link', index: props.index })
                  }
                  onMouseLeave={() => setHovered(null)}
                  onDrilldownClick={onDrilldownClick}
                />
              )}
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
                    const tooltipInfo =
                      hovered?.type === 'link'
                        ? (
                            data.links[hovered.index] as {
                              tooltipInfo?: Array<{
                                name: string;
                                value: number;
                              }>;
                            }
                          )?.tooltipInfo
                        : undefined;
                    // `data` is typed as the generic recharts SankeyData, so
                    // the extra fields convertToSankeyData attaches (same as
                    // the links cast above) aren't visible without this cast.
                    const hoveredNode =
                      hovered?.type === 'node'
                        ? (data.nodes[hovered.index] as SankeyGraphNode)
                        : undefined;
                    const showInOutNet =
                      hoveredNode?.inflow !== undefined &&
                      hoveredNode?.outflow !== undefined &&
                      hoveredNode.inflow > 0 &&
                      hoveredNode.outflow > 0;
                    const redactedFont = privacyMode
                      ? t('Redacted Script')
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
                        <div>
                          {name && (
                            <div style={{ marginBottom: 10 }}>
                              <strong>{name}</strong>
                            </div>
                          )}
                          <div style={{ lineHeight: 1.4 }}>
                            {showInOutNet && hoveredNode ? (
                              <>
                                <AlignedText
                                  left={t('In')}
                                  right={
                                    <FinancialText
                                      style={{
                                        color: theme.reportsNumberPositive,
                                        fontFamily: redactedFont,
                                      }}
                                    >
                                      {format(
                                        hoveredNode.inflow ?? 0,
                                        'financial',
                                      )}
                                    </FinancialText>
                                  }
                                />
                                <AlignedText
                                  left={t('Out')}
                                  right={
                                    <FinancialText
                                      style={{
                                        color: theme.reportsNumberNegative,
                                        fontFamily: redactedFont,
                                      }}
                                    >
                                      {format(
                                        -(hoveredNode.outflow ?? 0),
                                        'financial',
                                      )}
                                    </FinancialText>
                                  }
                                />
                                <AlignedText
                                  left={t('Net')}
                                  right={
                                    <FinancialText
                                      style={{ fontFamily: redactedFont }}
                                    >
                                      {format(
                                        (hoveredNode.inflow ?? 0) -
                                          (hoveredNode.outflow ?? 0),
                                        'financial',
                                      )}
                                    </FinancialText>
                                  }
                                  style={{ fontWeight: 600 }}
                                />
                              </>
                            ) : tooltipInfo && tooltipInfo.length > 0 ? (
                              <>
                                {tooltipInfo.map(item => (
                                  <AlignedText
                                    key={item.name}
                                    left={item.name}
                                    right={
                                      <FinancialText
                                        style={{ fontFamily: redactedFont }}
                                      >
                                        {format(item.value, 'financial')}
                                      </FinancialText>
                                    }
                                  />
                                ))}
                                <AlignedText
                                  left={t('Total')}
                                  right={
                                    <FinancialText
                                      style={{ fontFamily: redactedFont }}
                                    >
                                      {format(value, 'financial')}
                                    </FinancialText>
                                  }
                                  style={{ fontWeight: 600 }}
                                />
                              </>
                            ) : (
                              <FinancialText
                                style={{ fontFamily: redactedFont }}
                              >
                                {format(value, 'financial')}
                              </FinancialText>
                            )}
                          </div>
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
