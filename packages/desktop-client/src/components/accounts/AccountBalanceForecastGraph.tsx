import React, { memo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, Ref } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

import {
  clampRange,
  getBalanceChange,
  getBalanceOnDate,
  getDateAtRatio,
  getDefaultRange,
  getLowestProjectedPoint,
  getNearestPoint,
  getPointsInRange,
  getRatioOfDate,
} from './balanceHistoryGraphData';
import type {
  BalanceGraphRange,
  DailyBalancePoint,
} from './balanceHistoryGraphData';

const LABEL_WIDTH = 110;
const OVERVIEW_HEIGHT = 18;
const OVERVIEW_GAP = 4;
const MIN_RANGE_DAYS = 7;
const DATE_FORMAT = 'MMM d, yyyy';
const GRADIENT_ID = 'account-balance-forecast-gradient';

function clampDate(date: string, min: string, max: string) {
  return date < min ? min : date > max ? max : date;
}

type AccountBalanceForecastGraphProps = {
  points: DailyBalancePoint[];
  today: string;
  isLoading: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
};

export function AccountBalanceForecastGraph({
  points,
  today,
  isLoading,
  selectedDate,
  onSelectDate,
  style,
  ref,
}: AccountBalanceForecastGraphProps) {
  const format = useFormat();
  const locale = useLocale();
  const [range, setRange] = useState<BalanceGraphRange | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [draggedDate, setDraggedDate] = useState<string | null>(null);
  // State to track if the chart is hovered (used to conditionally render PrivacyFilter)
  const [isHovered, setIsHovered] = useState(false);

  const visibleRange = range
    ? clampRange(points, range)
    : getDefaultRange(points, today);
  const visiblePoints = visibleRange
    ? getPointsInRange(points, visibleRange, today)
    : [];
  const lowestPoint = getLowestProjectedPoint(points, today);
  const percentageChange = visibleRange
    ? getBalanceChange(points, visibleRange.start, visibleRange.end)
    : 0;

  const formatDate = (date: string) =>
    monthUtils.format(date, DATE_FORMAT, locale);

  return (
    <View ref={ref} style={{ margin: 10, ...style }}>
      <AutoSizer
        renderProp={({ width = 0, height = 0 }) => {
          if (width === 0 || height === 0) {
            return null;
          }

          if (!visibleRange) {
            return (
              <div style={{ width, height }}>
                <LoadingIndicator />
              </div>
            );
          }

          const chartWidth = width - LABEL_WIDTH;
          const chartHeight = height - OVERVIEW_HEIGHT - OVERVIEW_GAP;
          const displayedDate =
            draggedDate ??
            hoveredDate ??
            selectedDate ??
            clampDate(today, visibleRange.start, visibleRange.end);

          return (
            <View style={{ width }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <View style={{ gap: OVERVIEW_GAP }}>
                  <div
                    style={{
                      position: 'relative',
                      width: chartWidth,
                      height: chartHeight,
                      cursor: 'pointer',
                    }}
                    onMouseMove={event => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setHoveredDate(
                        getNearestPoint(
                          visiblePoints,
                          (event.clientX - rect.left) / rect.width,
                        )?.date ?? null,
                      );
                    }}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() => {
                      if (hoveredDate) {
                        onSelectDate(
                          hoveredDate === selectedDate ? null : hoveredDate,
                        );
                      }
                    }}
                  >
                    <ForecastChart
                      points={visiblePoints}
                      today={today}
                      selectedDate={selectedDate}
                      lowestPoint={lowestPoint}
                      width={chartWidth}
                      height={chartHeight}
                      isLoading={isLoading}
                    />
                    {hoveredDate && hoveredDate !== selectedDate && (
                      <HoverLine points={visiblePoints} date={hoveredDate} />
                    )}
                  </div>
                  <RangeOverview
                    points={points}
                    range={visibleRange}
                    width={chartWidth}
                    height={OVERVIEW_HEIGHT}
                    onChange={setRange}
                    onDrag={setDraggedDate}
                  />
                </View>

                <SpaceBetween
                  direction="vertical"
                  style={{
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    width: LABEL_WIDTH,
                    textAlign: 'right',
                    ...styles.verySmallText,
                  }}
                >
                  {percentageChange === 0 ? (
                    <div />
                  ) : (
                    <Text
                      style={{
                        color:
                          percentageChange >= 0
                            ? theme.reportsNumberPositive
                            : theme.reportsNumberNegative,
                      }}
                    >
                      {percentageChange >= 0 ? '+' : ''}
                      {percentageChange.toFixed(1)}%
                    </Text>
                  )}

                  {lowestPoint && (
                    <View>
                      <Text style={{ color: theme.pageTextSubdued }}>
                        <Trans>Lowest</Trans> {formatDate(lowestPoint.date)}
                      </Text>
                      <PrivacyFilter activationFilters={[() => !isHovered]}>
                        <FinancialText
                          style={{
                            color:
                              lowestPoint.balance < 0
                                ? theme.reportsNumberNegative
                                : theme.pageTextSubdued,
                          }}
                        >
                          {format(lowestPoint.balance, 'financial')}
                        </FinancialText>
                      </PrivacyFilter>
                    </View>
                  )}

                  <View>
                    <Text style={{ fontWeight: 800 }}>
                      {formatDate(displayedDate)}
                    </Text>
                    <PrivacyFilter activationFilters={[() => !isHovered]}>
                      <FinancialText>
                        {format(
                          getBalanceOnDate(points, displayedDate),
                          'financial',
                        )}
                      </FinancialText>
                    </PrivacyFilter>
                  </View>
                </SpaceBetween>
              </div>
            </View>
          );
        }}
      />
    </View>
  );
}

type RangeOverviewProps = {
  points: DailyBalancePoint[];
  range: BalanceGraphRange;
  width: number;
  height: number;
  onChange: (range: BalanceGraphRange | null) => void;
  onDrag: (date: string | null) => void;
};

type RangeDrag = {
  edge: 'start' | 'end' | 'both';
  originX: number;
  originRange: BalanceGraphRange;
};

// The whole graph in miniature, with a window over the part shown above it.
// The window can be moved, and resized from its edges.
function RangeOverview({
  points,
  range,
  width,
  height,
  onChange,
  onDrag,
}: RangeOverviewProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const drag = useRef<RangeDrag | null>(null);

  const fullRange = {
    start: points[0].date,
    end: points[points.length - 1].date,
  };
  const totalDays = monthUtils.differenceInCalendarDays(
    fullRange.end,
    fullRange.start,
  );

  const moveRange = (
    edge: RangeDrag['edge'],
    originRange: BalanceGraphRange,
    days: number,
  ) => {
    let { start, end } = originRange;
    const minDays = Math.min(MIN_RANGE_DAYS, totalDays);
    switch (edge) {
      case 'both': {
        const span = monthUtils.differenceInCalendarDays(end, start);
        start = clampDate(
          monthUtils.addDays(start, days),
          fullRange.start,
          monthUtils.subDays(fullRange.end, span),
        );
        end = monthUtils.addDays(start, span);
        break;
      }
      case 'start':
        start = clampDate(
          monthUtils.addDays(start, days),
          fullRange.start,
          monthUtils.subDays(end, minDays),
        );
        break;
      default:
        end = clampDate(
          monthUtils.addDays(end, days),
          monthUtils.addDays(start, minDays),
          fullRange.end,
        );
        break;
    }
    onChange({ start, end });
    return edge === 'end' ? end : start;
  };

  const onPointerDown = (
    event: PointerEvent<HTMLDivElement>,
    edge: RangeDrag['edge'],
  ) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { edge, originX: event.clientX, originRange: range };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) {
      const { edge, originX, originRange } = drag.current;
      onDrag(
        moveRange(
          edge,
          originRange,
          Math.round(((event.clientX - originX) / width) * totalDays),
        ),
      );
    }
  };

  const onPointerUp = () => {
    drag.current = null;
    onDrag(null);
  };

  // Clicking outside the window centers it on that point.
  const onTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const date = getDateAtRatio(
      fullRange,
      (event.clientX - rect.left) / rect.width,
    );
    const span = monthUtils.differenceInCalendarDays(range.end, range.start);
    moveRange(
      'both',
      range,
      monthUtils.differenceInCalendarDays(date, range.start) -
        Math.round(span / 2),
    );
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    edge: 'start' | 'end',
  ) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.shiftKey ? 30 : 1;
      event.preventDefault();
      moveRange(edge, range, event.key === 'ArrowLeft' ? -step : step);
    }
  };

  const renderHandle = (edge: 'start' | 'end') => {
    const date = edge === 'start' ? range.start : range.end;
    const label = monthUtils.format(date, DATE_FORMAT, locale);
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-label={
          edge === 'start' ? t('Graph start date') : t('Graph end date')
        }
        aria-valuemin={0}
        aria-valuemax={totalDays}
        aria-valuenow={monthUtils.differenceInCalendarDays(
          date,
          fullRange.start,
        )}
        aria-valuetext={label}
        title={label}
        onPointerDown={event => onPointerDown(event, edge)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={event => onKeyDown(event, edge)}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [edge === 'start' ? 'left' : 'right']: -6,
          width: 11,
          cursor: 'ew-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 4,
            height: '80%',
            borderRadius: 2,
            backgroundColor: theme.pageText,
          }}
        />
      </div>
    );
  };

  const startRatio = getRatioOfDate(fullRange, range.start);
  const endRatio = getRatioOfDate(fullRange, range.end);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'pointer',
      }}
      onPointerDown={onTrackPointerDown}
    >
      <OverviewChart points={points} width={width} height={height} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${startRatio * 100}%`,
          width: `${(endRatio - startRatio) * 100}%`,
          border: `1px solid ${theme.pageTextSubdued}`,
          borderRadius: 3,
          cursor: 'grab',
        }}
        onPointerDown={event => onPointerDown(event, 'both')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => onChange(null)}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: theme.reportsChartFill,
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        />
        {renderHandle('start')}
        {renderHandle('end')}
      </div>
    </div>
  );
}

type OverviewChartProps = {
  points: DailyBalancePoint[];
  width: number;
  height: number;
};

const OverviewChart = memo(function OverviewChart({
  points,
  width,
  height,
}: OverviewChartProps) {
  const animationProps = useRechartsAnimation({ isAnimationActive: false });

  return (
    <AreaChart
      data={points}
      width={width}
      height={height}
      margin={{ top: 1, right: 0, bottom: 1, left: 0 }}
    >
      <XAxis
        dataKey="time"
        type="number"
        scale="time"
        domain={['dataMin', 'dataMax']}
        hide
      />
      <YAxis domain={['dataMin', 'dataMax']} hide />
      <Area
        type="stepAfter"
        dataKey="balance"
        stroke={theme.pageTextSubdued}
        strokeWidth={1}
        fill={theme.pageTextSubdued}
        fillOpacity={0.15}
        {...animationProps}
      />
    </AreaChart>
  );
});

type HoverLineProps = {
  points: readonly DailyBalancePoint[];
  date: string;
};

// Drawn over the chart instead of inside it, so moving the mouse doesn't
// re-render every point of the graph. Uses the same scales as the chart.
function HoverLine({ points, date }: HoverLineProps) {
  const point = points.find(p => p.date === date);
  if (!point) {
    return null;
  }

  const firstTime = points[0].time;
  const totalTime = points[points.length - 1].time - firstTime;
  const left = totalTime === 0 ? 0 : (point.time - firstTime) / totalTime;

  const balances = points.map(p => p.balance);
  const maxBalance = Math.max(...balances);
  const totalBalance = maxBalance - Math.min(...balances);
  const top =
    totalBalance === 0 ? 0.5 : (maxBalance - point.balance) / totalBalance;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${left * 100}%`,
        borderLeft: `1px dashed ${theme.pageTextSubdued}`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: `${top * 100}%`,
          left: -4,
          width: 7,
          height: 7,
          marginTop: -3.5,
          borderRadius: '50%',
          backgroundColor:
            point.balance < 0 ? theme.reportsNumberNegative : theme.reportsBlue,
        }}
      />
    </div>
  );
}

type ForecastChartProps = {
  points: DailyBalancePoint[];
  today: string;
  selectedDate: string | null;
  lowestPoint: DailyBalancePoint | null;
  width: number;
  height: number;
  isLoading: boolean;
};

const ForecastChart = memo(function ForecastChart({
  points,
  today,
  selectedDate,
  lowestPoint,
  width,
  height,
  isLoading,
}: ForecastChartProps) {
  const animationProps = useRechartsAnimation({ isAnimationActive: false });

  const todayPoint = points.find(point => point.date === today) ?? null;
  const balances = points.map(point => point.balance);
  const maxBalance = Math.max(...balances);
  const minBalance = Math.min(...balances);
  // Where zero falls in the chart, measured from the top. The line turns red
  // below it.
  const zeroOffset =
    maxBalance <= 0
      ? 0
      : minBalance >= 0
        ? 100
        : (maxBalance / (maxBalance - minBalance)) * 100;

  return (
    <AreaChart
      data={points}
      width={width}
      height={height}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      style={{ opacity: isLoading ? 0.45 : 1 }}
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          <stop offset={`${zeroOffset}%`} stopColor={theme.reportsChartFill} />
          <stop
            offset={`${zeroOffset}%`}
            stopColor={theme.reportsNumberNegative}
          />
        </linearGradient>
      </defs>
      <XAxis
        dataKey="time"
        type="number"
        scale="time"
        domain={['dataMin', 'dataMax']}
        hide
      />
      <YAxis domain={['dataMin', 'dataMax']} hide />
      {minBalance < 0 && maxBalance > 0 && (
        <ReferenceLine y={0} stroke={theme.pageTextSubdued} />
      )}
      {todayPoint && todayPoint !== points[points.length - 1] && (
        <ReferenceLine
          x={todayPoint.time}
          stroke={theme.reportsBlue}
          strokeDasharray="4 4"
        />
      )}
      {selectedDate && (
        <ReferenceLine
          x={monthUtils._parse(selectedDate).getTime()}
          stroke={theme.pageText}
        />
      )}
      <Area
        type="stepAfter"
        dataKey="actual"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth={2}
        fill={`url(#${GRADIENT_ID})`}
        fillOpacity={0.2}
        connectNulls={false}
        {...animationProps}
      />
      <Area
        type="stepAfter"
        dataKey="projected"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth={2}
        strokeDasharray="4 4"
        fill={`url(#${GRADIENT_ID})`}
        fillOpacity={0.08}
        connectNulls={false}
        {...animationProps}
      />
      {lowestPoint && (
        <ReferenceDot
          x={lowestPoint.time}
          y={lowestPoint.balance}
          r={3}
          fill={
            lowestPoint.balance < 0
              ? theme.reportsNumberNegative
              : theme.reportsBlue
          }
          stroke="none"
        />
      )}
    </AreaChart>
  );
});
