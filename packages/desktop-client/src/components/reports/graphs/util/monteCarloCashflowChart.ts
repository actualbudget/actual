import { theme } from '@actual-app/components/theme';
import type { TFunction } from 'i18next';

import { getColorScale } from '#components/reports/chart-theme';
import {
  getActiveSpendingPhase,
  resolveSpendingPhases,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloContribution,
  MonteCarloPot,
  MonteCarloRunDetailRow,
  MonteCarloSpendingPhase,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';

export type MonteCarloCashflowSeriesKind =
  | 'pot'
  | 'contribution'
  | 'phase'
  | 'tax';

/** One stacked bar series of the cashflow chart */
export type MonteCarloCashflowSeries = {
  /** Identifies the series' entry in each data point's amounts */
  key: string;
  kind: MonteCarloCashflowSeriesKind;
  label: string;
  color: string;
};

/**
 * A headed section of the cashflow tooltip - e.g. "Withdrawals" with a
 * row per pot. A single-series group (Tax) sets listMembers false so
 * the heading row alone carries its value.
 */
export type MonteCarloCashflowTooltipGroup = {
  key: string;
  heading: string;
  series: MonteCarloCashflowSeries[];
  listMembers: boolean;
};

/** One charted year */
export type MonteCarloCashflowDataPoint = {
  year: number;
  age: number;
  /** A synthetic year after the plan ran out: spending with no funding */
  afterDepletion: boolean;
  /** Per series key: positive for money in, negative for money out */
  amounts: Record<string, number>;
};

export type MonteCarloCashflowChart = {
  data: MonteCarloCashflowDataPoint[];
  /** Series stacked above zero: pot withdrawals, then contributions */
  inflowSeries: MonteCarloCashflowSeries[];
  /** Series stacked below zero: planned spending by phase, then tax */
  outflowSeries: MonteCarloCashflowSeries[];
  tooltipGroups: MonteCarloCashflowTooltipGroup[];
  /** Each year's total money in and total money out, for axis padding */
  stackExtents: number[];
};

type BuildMonteCarloCashflowChartInput = {
  /** The captured run to chart, one row per simulated year */
  rows: MonteCarloRunDetailRow[];
  pots: MonteCarloPot[];
  contributions: MonteCarloContribution[];
  spendingPhases: MonteCarloSpendingPhase[];
  /** The user's current age; a row's age is startAge + year - 1 */
  startAge: number;
  t: TFunction;
};

function seriesKey(kind: MonteCarloCashflowSeriesKind, index: number) {
  return `${kind}${index}`;
}

/**
 * Turns a captured run into the cashflow chart's series and data: money
 * in above zero (each pot's gross withdrawal, plus each contribution),
 * money out below zero (the planned spending, coloured by its spending
 * phase, plus tax). Spending shows the plan rather than the delivered
 * amount, so in a shortfall year the withdrawal bars visibly fall short
 * of the spending bar. Fees stay out - they never pass through the
 * user's hands.
 */
export function buildMonteCarloCashflowChart({
  rows,
  pots,
  contributions,
  spendingPhases,
  startAge,
  t,
}: BuildMonteCarloCashflowChartInput): MonteCarloCashflowChart {
  const colorScale = getColorScale('qualitative');
  const phases = resolveSpendingPhases(spendingPhases);
  const hasTax = rows.some(row => row.taxPaid !== 0);

  // Inflows take colours from the start of the scale and spending phases
  // from the end, so the two sides of the zero line only share a colour
  // once the scale is exhausted
  const potSeries: MonteCarloCashflowSeries[] = pots.map((pot, potIndex) => ({
    key: seriesKey('pot', potIndex),
    kind: 'pot',
    label: pot.name || t('Pot {{number}}', { number: potIndex + 1 }),
    color: colorScale[potIndex % colorScale.length],
  }));
  // Only contributions that deposit something in this run get a series
  const contributionSeries: MonteCarloCashflowSeries[] = contributions.flatMap(
    (contribution, contributionIndex) =>
      rows.some(row => (row.contributionAmounts[contributionIndex] ?? 0) !== 0)
        ? [
            {
              key: seriesKey('contribution', contributionIndex),
              kind: 'contribution' as const,
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
    (phase, phaseIndex) => {
      // Numbered as the spending editor lists them (the resolved list is
      // sorted by age); the default stand-in phase reads as Phase 1
      const configuredIndex = spendingPhases.indexOf(phase);
      return {
        key: seriesKey('phase', phaseIndex),
        kind: 'phase',
        label:
          phase.name ||
          t('Phase {{number}}', {
            number: configuredIndex === -1 ? 1 : configuredIndex + 1,
          }),
        color:
          colorScale[colorScale.length - 1 - (phaseIndex % colorScale.length)],
      };
    },
  );
  const taxSeries: MonteCarloCashflowSeries = {
    key: seriesKey('tax', 0),
    kind: 'tax',
    label: t('Tax'),
    color: theme.reportsNumberNegative,
  };

  const inflowSeries = [...potSeries, ...contributionSeries];
  const outflowSeries = [...phaseSeries, ...(hasTax ? [taxSeries] : [])];

  // Tax sits between Withdrawals and Spending so the deduction chain
  // reads in order: gross withdrawal, minus tax, leaves spending
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
    {
      key: 'spending',
      heading: t('Spending'),
      series: phaseSeries,
      listMembers: true,
    },
  ];

  const data = rows.map((row): MonteCarloCashflowDataPoint => {
    const age = startAge + row.year - 1;
    const amounts: Record<string, number> = {};
    potSeries.forEach((series, potIndex) => {
      amounts[series.key] = row.potWithdrawals[potIndex] ?? 0;
    });
    contributions.forEach((_, contributionIndex) => {
      amounts[seriesKey('contribution', contributionIndex)] =
        row.contributionAmounts[contributionIndex] ?? 0;
    });
    // The year's planned spend belongs to whichever phase is active
    const activePhase = getActiveSpendingPhase(phases, age);
    phaseSeries.forEach((series, phaseIndex) => {
      amounts[series.key] =
        phases[phaseIndex] === activePhase ? -row.plannedSpending : 0;
    });
    if (hasTax) {
      amounts[taxSeries.key] = -row.taxPaid;
    }
    return {
      year: row.year,
      age,
      afterDepletion: row.afterDepletion === true,
      amounts,
    };
  });

  const stackExtents = data.flatMap(point => [
    sumAmounts(point, inflowSeries),
    sumAmounts(point, outflowSeries),
  ]);

  return { data, inflowSeries, outflowSeries, tooltipGroups, stackExtents };
}

function sumAmounts(
  point: MonteCarloCashflowDataPoint,
  series: MonteCarloCashflowSeries[],
) {
  return series.reduce(
    (sum, entry) => sum + (point.amounts[entry.key] ?? 0),
    0,
  );
}
