import { Trans, useTranslation } from 'react-i18next';

import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  getColorScale,
  useRechartsAnimation,
} from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import type {
  MonteCarloCashflowDataPoint,
  MonteCarloCashflowSeries,
  MonteCarloCashflowTooltipGroup,
} from '#components/reports/graphs/MonteCarloCashflowGraphTooltip';
import { MonteCarloCashflowGraphTooltip } from '#components/reports/graphs/MonteCarloCashflowGraphTooltip';
import { MonteCarloCashflowLegendGroup } from '#components/reports/graphs/MonteCarloCashflowLegendGroup';
import { computePadding } from '#components/reports/graphs/util/computePadding';
import {
  createMonteCarloSpendingPhase,
  getActiveSpendingPhase,
  MAX_FORMATTABLE_AMOUNT,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloContribution,
  MonteCarloPot,
  MonteCarloRunDetailRow,
  MonteCarloSpendingPhase,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { GROUP_HEADING_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

const MAX_BAR_SIZE = 50;

type MonteCarloCashflowGraphProps = {
  style?: CSSProperties;
  /** The captured run to chart, one row per simulated year */
  rows: MonteCarloRunDetailRow[];
  pots: MonteCarloPot[];
  contributions: MonteCarloContribution[];
  spendingPhases: MonteCarloSpendingPhase[];
  /** The user's current age; the x-axis shows startAge + year - 1 */
  startAge: number;
  showLegend?: boolean;
};

/**
 * Yearly cashflow of a single simulated run: money in above zero (each
 * pot's gross withdrawal, plus contributions), money out below zero (the
 * planned spending, colored by its spending phase, plus tax), and a net
 * line showing the pots' drawdown (withdrawals minus contributions).
 * Spending shows the plan rather than the delivered amount, so in a
 * shortfall year the withdrawal bars visibly fall short of the spending
 * bar. Fees stay out of the chart - they never pass through the user's
 * hands.
 */
export function MonteCarloCashflowGraph({
  style,
  rows,
  pots,
  contributions,
  spendingPhases,
  startAge,
  showLegend = true,
}: MonteCarloCashflowGraphProps) {
  const { t } = useTranslation();
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const animationProps = useRechartsAnimation({ animationDuration: 1000 });
  const colorScale = getColorScale('qualitative');

  // The engine falls back to a default phase when none are configured;
  // mirror it so every year has a phase to attribute spending to
  const phases = spendingPhases.length
    ? spendingPhases
    : [createMonteCarloSpendingPhase('phase-1')];

  const hasTax = rows.some(row => row.taxPaid !== 0);

  const potSeries: MonteCarloCashflowSeries[] = pots.map((pot, potIndex) => ({
    key: `pot${potIndex}`,
    label: pot.name || t('Pot {{number}}', { number: potIndex + 1 }),
    color: colorScale[potIndex % colorScale.length],
  }));
  // Only contributions that deposit something in this run get a series -
  // one per configured contribution, so deposits split by their source
  const contributionSeries: MonteCarloCashflowSeries[] = contributions.flatMap(
    (contribution, contributionIndex) =>
      rows.some(row => row.contributionAmounts[contributionIndex] !== 0)
        ? [
            {
              key: `contribution${contributionIndex}`,
              label:
                contribution.name ||
                t('Contribution {{number}}', {
                  number: contributionIndex + 1,
                }),
              color:
                colorScale[
                  (pots.length + contributionIndex) % colorScale.length
                ],
            },
          ]
        : [],
  );
  const phaseSeries: MonteCarloCashflowSeries[] = phases.map(
    (phase, phaseIndex) => ({
      key: `phase${phaseIndex}`,
      label: phase.name || t('Phase {{number}}', { number: phaseIndex + 1 }),
      color:
        colorScale[
          (pots.length + contributions.length + phaseIndex) % colorScale.length
        ],
    }),
  );
  const taxSeries: MonteCarloCashflowSeries = {
    key: 'tax',
    label: t('Tax'),
    color: theme.reportsNumberNegative,
  };

  const inflowSeries: MonteCarloCashflowSeries[] = [
    ...potSeries,
    ...contributionSeries,
  ];
  const outflowSeries: MonteCarloCashflowSeries[] = [
    ...phaseSeries,
    ...(hasTax ? [taxSeries] : []),
  ];

  // The tooltip's headed sections: per-pot rows under Withdrawals,
  // per-phase rows under Spending; Contributions and Tax stand alone
  const tooltipGroups: MonteCarloCashflowTooltipGroup[] = [
    {
      key: 'withdrawals',
      heading: t('Withdrawals'),
      series: potSeries,
      listMembers: true,
    },
    ...(contributionSeries.length > 0
      ? [
          {
            key: 'contributions',
            heading: t('Contributions'),
            series: contributionSeries,
            listMembers: true,
          },
        ]
      : []),
    {
      key: 'spending',
      heading: t('Spending'),
      series: phaseSeries,
      listMembers: true,
    },
    ...(hasTax
      ? [
          {
            key: 'tax',
            heading: t('Tax'),
            series: [taxSeries],
            listMembers: false,
          },
        ]
      : []),
  ];

  const data: MonteCarloCashflowDataPoint[] = rows.map(row => {
    const age = startAge + row.year - 1;
    const point: MonteCarloCashflowDataPoint = { year: row.year, age };
    pots.forEach((_, potIndex) => {
      point[`pot${potIndex}`] = row.potWithdrawals[potIndex] ?? 0;
    });
    contributions.forEach((_, contributionIndex) => {
      point[`contribution${contributionIndex}`] =
        row.contributionAmounts[contributionIndex] ?? 0;
    });
    // The year's planned spend belongs to whichever phase is active
    const activePhaseId = getActiveSpendingPhase(phases, age).id;
    phases.forEach((phase, phaseIndex) => {
      point[`phase${phaseIndex}`] =
        phase.id === activePhaseId ? -row.plannedSpending : 0;
    });
    if (hasTax) {
      point.tax = -row.taxPaid;
    }
    // The pots' net drawdown: what they paid out over what went in.
    // Positive while living off the pots, negative while accumulating -
    // NOT the sum of the bars, since the withdrawal and the spending it
    // funds are the same money seen twice
    point.net = row.withdrawal - row.contributions;
    return point;
  });

  const tickFormatter = (tick: number) => {
    if (privacyMode) {
      return '...';
    }
    // Recharts can synthesize ticks beyond the (already clamped) data
    // extremes; keep them within what the formatter accepts
    const safeTick = Math.min(
      Math.max(Math.round(tick), -MAX_FORMATTABLE_AMOUNT),
      MAX_FORMATTABLE_AMOUNT,
    );
    return `${format(safeTick, 'financial-no-decimals')}`;
  };

  // Pad the left margin for the widest tick either side of zero
  const stackExtents = data.flatMap(point => [
    inflowSeries.reduce((sum, series) => sum + (point[series.key] ?? 0), 0),
    outflowSeries.reduce((sum, series) => sum + (point[series.key] ?? 0), 0),
  ]);

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
                dataKey={series.key}
                stackId="flow"
                fill={series.color}
                maxBarSize={MAX_BAR_SIZE}
                {...animationProps}
              />
            ))}
            <Line
              type="monotone"
              dataKey="net"
              dot={false}
              stroke={theme.pageTextLight}
              strokeWidth={2}
              {...animationProps}
            />
          </ComposedChart>
        )}
      </Container>
      {showLegend && (
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
          <View style={{ gap: 6 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Net</Trans>
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 12,
                  height: 2,
                  backgroundColor: theme.pageTextLight,
                }}
              />
              <Text>
                <Trans>Net cashflow</Trans>
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
