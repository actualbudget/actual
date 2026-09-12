import { useTranslation } from 'react-i18next';

import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { MonteCarloCashflowGraphTooltip } from '#components/reports/graphs/MonteCarloCashflowGraphTooltip';
import { MonteCarloCashflowLegendGroup } from '#components/reports/graphs/MonteCarloCashflowLegendGroup';
import { computePadding } from '#components/reports/graphs/util/computePadding';
import { buildMonteCarloCashflowChart } from '#components/reports/graphs/util/monteCarloCashflowChart';
import { useMonteCarloTickFormatter } from '#components/reports/graphs/util/useMonteCarloTickFormatter';
import type {
  MonteCarloContribution,
  MonteCarloPot,
  MonteCarloRunDetailRow,
  MonteCarloSpendingPhase,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useFormat } from '#hooks/useFormat';

const MAX_BAR_SIZE = 50;

/** Bars for years after the plan ran out are dimmed to this opacity */
const UNFUNDED_BAR_OPACITY = 0.45;

type MonteCarloCashflowGraphProps = {
  /** Applies to the whole block (chart plus legend); the chart itself is Container's default height */
  style?: CSSProperties;
  /** The captured run to chart, one row per simulated year */
  rows: MonteCarloRunDetailRow[];
  pots: MonteCarloPot[];
  contributions: MonteCarloContribution[];
  spendingPhases: MonteCarloSpendingPhase[];
  /** The user's current age; the x-axis shows startAge + year - 1 */
  startAge: number;
};

/**
 * Yearly cashflow of a single simulated run as stacked bars: money in
 * above zero, money out below. See buildMonteCarloCashflowChart for
 * what the series are and how spending is attributed.
 */
export function MonteCarloCashflowGraph({
  style,
  rows,
  pots,
  contributions,
  spendingPhases,
  startAge,
}: MonteCarloCashflowGraphProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const tickFormatter = useMonteCarloTickFormatter();
  const animationProps = useRechartsAnimation({ animationDuration: 1000 });

  const { data, inflowSeries, outflowSeries, tooltipGroups, stackExtents } =
    buildMonteCarloCashflowChart({
      rows,
      pots,
      contributions,
      spendingPhases,
      startAge,
      translate: t,
    });

  return (
    <View style={style}>
      <Container>
        {(width, height) => (
          <ComposedChart
            width={width}
            height={height}
            stackOffset="sign"
            data={data}
            margin={{
              top: 15,
              right: 0,
              left: computePadding(stackExtents, value =>
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
                <MonteCarloCashflowGraphTooltip groups={tooltipGroups} />
              }
              isAnimationActive={false}
              cursor={{ fill: 'transparent' }}
            />
            <ReferenceLine y={0} stroke={theme.pageText} />
            {[...inflowSeries, ...outflowSeries].map(series => (
              <Bar
                key={series.key}
                dataKey={`amounts.${series.key}`}
                stackId="flow"
                fill={series.color}
                maxBarSize={MAX_BAR_SIZE}
                {...animationProps}
              >
                {/* Only spending remains after the plan runs out; dim it
                    so those years read as planned-but-unfunded */}
                {series.kind === 'phase' &&
                  data.map(point => (
                    <Cell
                      key={point.year}
                      fill={series.color}
                      fillOpacity={
                        point.afterDepletion ? UNFUNDED_BAR_OPACITY : 1
                      }
                    />
                  ))}
              </Bar>
            ))}
          </ComposedChart>
        )}
      </Container>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 40,
          rowGap: 10,
          marginTop: 10,
        }}
      >
        <MonteCarloCashflowLegendGroup
          heading={t('Money in')}
          series={inflowSeries}
        />
        <MonteCarloCashflowLegendGroup
          heading={t('Money out')}
          series={outflowSeries}
        />
      </View>
    </View>
  );
}
