import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

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
import { useFormat } from '#hooks/useFormat';
import { useIsInViewport } from '#hooks/useIsInViewport';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

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
  started: boolean;
  payload: SankeyLinkPayload;
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
  containerWidth,
  started,
  payload,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: SankeyLinkProps) {
  const isTestEnv = useIsTestEnv();

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
        isTestEnv ? undefined : started ? fadeInClass(fraction) : hiddenClass
      }
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
  payload: SankeyGraphNode;
  containerWidth: number;
  started: boolean;
  showPercentages?: boolean;
  color?: string;
};
function SankeyNode({
  x,
  y,
  width,
  height,
  payload,
  containerWidth,
  started,
  showPercentages,
}: SankeyNodeProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const isTestEnv = useIsTestEnv();

  if (payload.value <= 0) {
    return null;
  }
  const isOut = x + width + 6 > containerWidth;

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
        isTestEnv
          ? undefined
          : started
            ? fadeInClass(x / containerWidth)
            : hiddenClass
      }
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
};
export function SankeyGraph({
  style,
  data,
  showTooltip = true,
  showPercentages = false,
}: SankeyGraphProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);

  // start the load animation only once the card scrolls into view
  const viewportRef = useRef<HTMLDivElement>(null);
  const isInViewport = useIsInViewport(viewportRef);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (isInViewport) {
      setStarted(true);
    }
  }, [isInViewport]);

  return (
    <div ref={viewportRef} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Container style={style}>
        {(width, height) => (
          <ResponsiveContainer>
            <Sankey
              data={data}
              node={props => (
                <SankeyNode
                  {...props}
                  containerWidth={width}
                  started={started}
                  showPercentages={showPercentages}
                />
              )}
              link={props => (
                <SankeyLink
                  {...props}
                  containerWidth={width}
                  started={started}
                  isHovered={hoveredLinkIndex === props.index}
                  onMouseEnter={() => setHoveredLinkIndex(props.index)}
                  onMouseLeave={() => setHoveredLinkIndex(null)}
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
    </div>
  );
}
