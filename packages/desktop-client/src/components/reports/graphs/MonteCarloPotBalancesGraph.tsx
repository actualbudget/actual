import { useTranslation } from 'react-i18next';

import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { MonteCarloCashflowGraphTooltip } from '#components/reports/graphs/MonteCarloCashflowGraphTooltip';
import { MonteCarloCashflowLegendGroup } from '#components/reports/graphs/MonteCarloCashflowLegendGroup';
import { computePadding } from '#components/reports/graphs/util/computePadding';
import { buildMonteCarloPotBalancesChart } from '#components/reports/graphs/util/monteCarloPotBalancesChart';
import { useMonteCarloTickFormatter } from '#components/reports/graphs/util/useMonteCarloTickFormatter';
import type {
  MonteCarloPot,
  MonteCarloRunDetailRow,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useFormat } from '#hooks/useFormat';

const AREA_FILL_OPACITY = 0.6;

type MonteCarloPotBalancesGraphProps = {
  /** Applies to the whole block (chart plus legend); the chart itself is Container's default height */
  style?: CSSProperties;
  /** The captured run to chart, one row per simulated year */
  rows: MonteCarloRunDetailRow[];
  pots: MonteCarloPot[];
  /** The user's current age; the x-axis shows startAge + year - 1 */
  startAge: number;
};

/**
 * Each pot's balance at the end of every year of a single simulated run,
 * as stacked areas whose top is the plan's total. See
 * buildMonteCarloPotBalancesChart for the data shape.
 */
export function MonteCarloPotBalancesGraph({
  style,
  rows,
  pots,
  startAge,
}: MonteCarloPotBalancesGraphProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const tickFormatter = useMonteCarloTickFormatter();
  const animationProps = useRechartsAnimation({ animationDuration: 1000 });

  const { data, series, tooltipGroups, totals } =
    buildMonteCarloPotBalancesChart({ rows, pots, startAge, translate: t });

  return (
    <View style={style}>
      <Container>
        {(width, height) => (
          <ComposedChart
            width={width}
            height={height}
            data={data}
            margin={{
              top: 15,
              right: 0,
              left: computePadding(totals, value =>
                format(value, 'financial-no-decimals'),
              ),
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="age"
              tick={{ fill: theme.pageText }}
              tickLine={{ stroke: theme.pageText }}
              minTickGap={30}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fill: theme.pageText }}
              tickLine={{ stroke: theme.pageText }}
            />
            <Tooltip
              content={
                <MonteCarloCashflowGraphTooltip
                  groups={tooltipGroups}
                  afterDepletionNote={t('The pots had run out by this year.')}
                />
              }
              isAnimationActive={false}
            />
            {series.map(potSeries => (
              <Area
                key={potSeries.key}
                type="monotone"
                dataKey={`amounts.${potSeries.key}`}
                stackId="pots"
                stroke={potSeries.color}
                fill={potSeries.color}
                fillOpacity={AREA_FILL_OPACITY}
                {...animationProps}
              />
            ))}
          </ComposedChart>
        )}
      </Container>
      <View style={{ marginTop: 10 }}>
        <MonteCarloCashflowLegendGroup heading={t('Pots')} series={series} />
      </View>
    </View>
  );
}
