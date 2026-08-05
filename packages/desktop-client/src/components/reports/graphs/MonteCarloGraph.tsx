import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import type {
  FanChartDataPoint,
  MonteCarloGraphView,
} from '#components/reports/graphs/MonteCarloGraphTooltip';
import {
  MonteCarloGraphTooltip,
  VIEW_DATA_KEYS,
} from '#components/reports/graphs/MonteCarloGraphTooltip';
import { computePadding } from '#components/reports/graphs/util/computePadding';
import { MAX_FORMATTABLE_AMOUNT } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type { MonteCarloPercentileBand } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

type MonteCarloGraphProps = {
  style?: CSSProperties;
  percentileBands: MonteCarloPercentileBand[];
  /** The user's current age; the x-axis shows startAge + year */
  startAge: number;
  worstRunPath?: number[];
  view?: MonteCarloGraphView;
  compact?: boolean;
  showTooltip?: boolean;
};

export function MonteCarloGraph({
  style,
  percentileBands,
  startAge,
  worstRunPath,
  view = 'all',
  compact = false,
  showTooltip = true,
}: MonteCarloGraphProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const animationProps = useRechartsAnimation({ animationDuration: 1000 });

  const data: FanChartDataPoint[] = percentileBands.map(band => ({
    year: band.year,
    age: startAge + band.year,
    band80: [band.p10, band.p90],
    band50: [band.p25, band.p75],
    p5: band.p5,
    p10: band.p10,
    p25: band.p25,
    p30: band.p30,
    p50: band.p50,
    p70: band.p70,
    p75: band.p75,
    p90: band.p90,
    worstRun: worstRunPath?.[band.year],
  }));

  const tickFormatter = (tick: number) => {
    if (privacyMode) {
      return '...';
    }
    // Recharts can synthesize ticks above the (already clamped) data
    // maximum; keep them within what the formatter accepts
    const safeTick = Math.min(
      Math.max(Math.round(tick), -MAX_FORMATTABLE_AMOUNT),
      MAX_FORMATTABLE_AMOUNT,
    );
    return `${format(safeTick, 'financial-no-decimals')}`;
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) => (
        <ComposedChart
          width={width}
          height={height}
          data={data}
          margin={{
            top: compact ? 0 : 15,
            right: 0,
            left: compact
              ? 0
              : computePadding(
                  data.map(point => point.p90),
                  value => format(value, 'financial-no-decimals'),
                ),
            bottom: compact ? 0 : 10,
          }}
        >
          {!compact && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            dataKey="age"
            hide={compact}
            tick={{ fill: theme.pageText }}
            tickLine={{ stroke: theme.pageText }}
          />
          <YAxis
            hide={compact}
            tickFormatter={tickFormatter}
            tick={{ fill: theme.pageText }}
            tickLine={{ stroke: theme.pageText }}
          />
          {showTooltip && (
            <Tooltip
              content={<MonteCarloGraphTooltip view={view} />}
              isAnimationActive={false}
            />
          )}
          {view === 'all' ? (
            <>
              <Area
                type="monotone"
                dataKey="band80"
                stroke="none"
                fill={theme.reportsChartFill}
                fillOpacity={0.15}
                {...animationProps}
              />
              <Area
                type="monotone"
                dataKey="band50"
                stroke="none"
                fill={theme.reportsChartFill}
                fillOpacity={0.3}
                {...animationProps}
              />
              <Line
                type="monotone"
                dataKey="p50"
                dot={false}
                stroke={theme.reportsChartFill}
                strokeWidth={2}
                {...animationProps}
              />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey={VIEW_DATA_KEYS[view]}
              stroke={theme.reportsChartFill}
              strokeWidth={2}
              fill={theme.reportsChartFill}
              fillOpacity={0.08}
              {...animationProps}
            />
          )}
        </ComposedChart>
      )}
    </Container>
  );
}
