import { theme } from '@actual-app/components/theme';
import type { TFunction } from 'i18next';

import { getColorScale } from '#components/reports/chart-theme';
import {
  getActiveSpendingPhase,
  getMonteCarloPotLabel,
  getMonteCarloSurplusPotLabel,
  resolveSpendingPhases,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloContribution,
  MonteCarloIncomeStream,
  MonteCarloLumpSum,
  MonteCarloPot,
  MonteCarloRunDetailRow,
  MonteCarloSpendingPhase,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';

/**
 * The colour a pot is drawn in across the single-run charts: the
 * qualitative scale from its start, in pot order, so a pot looks the
 * same in the cashflow and pot balances charts
 */
export function getMonteCarloPotColor(potIndex: number): string {
  const colorScale = getColorScale('qualitative');
  return colorScale[potIndex % colorScale.length];
}

export type MonteCarloCashflowSeriesKind =
  | 'pot'
  | 'income'
  | 'phase'
  | 'tax'
  | 'contribution'
  | 'surplus'
  | 'lumpSum';

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
  /** Income the year didn't need - it left the plan */
  unspentIncome: number;
  /** Per series key: positive for money in, negative for money out */
  amounts: Record<string, number>;
};

export type MonteCarloCashflowChart = {
  data: MonteCarloCashflowDataPoint[];
  /** Series stacked above zero: pot withdrawals, then income streams */
  inflowSeries: MonteCarloCashflowSeries[];
  /**
   * Series stacked below zero: planned spending by phase, tax,
   * contributions, money saved, then one-off withdrawals
   */
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
  incomeStreams: MonteCarloIncomeStream[];
  spendingPhases: MonteCarloSpendingPhase[];
  lumpSums: MonteCarloLumpSum[];
  /** The user's current age; a row's age is startAge + year - 1 */
  startAge: number;
  translate: TFunction;
};

function seriesKey(kind: MonteCarloCashflowSeriesKind, index: number) {
  return `${kind}${index}`;
}

/**
 * Turns a captured run into the cashflow chart's series and data - the
 * household's yearly cashflow. Money in above zero: each pot's gross
 * withdrawal (regular and one-off together) and each income stream's
 * gross. Money out below zero: the planned spending (coloured by its
 * spending phase), tax on withdrawals, one-offs and income, each
 * contribution paid into a pot, money saved into the surplus pot, and
 * each one-off withdrawal received. Spending and one-offs show the plan
 * rather than the delivered amount, so in a shortfall year the inflows
 * visibly fall short of the bars below. Fees stay out - they never pass
 * through the user's hands.
 */
export function buildMonteCarloCashflowChart({
  rows,
  pots,
  contributions,
  incomeStreams,
  spendingPhases,
  lumpSums,
  startAge,
  translate,
}: BuildMonteCarloCashflowChartInput): MonteCarloCashflowChart {
  const colorScale = getColorScale('qualitative');
  const phases = resolveSpendingPhases(spendingPhases);
  const hasTax = rows.some(
    row => row.taxPaid !== 0 || row.incomeTax !== 0 || row.lumpSumTax !== 0,
  );

  // Inflows take colours from the start of the scale and outflows from
  // the end, so the two sides of the zero line only share a colour once
  // the scale is exhausted
  const inflowColor = (index: number) => colorScale[index % colorScale.length];
  const outflowColor = (index: number) =>
    colorScale[colorScale.length - 1 - (index % colorScale.length)];

  const potSeries: MonteCarloCashflowSeries[] = pots.map((pot, potIndex) => ({
    key: seriesKey('pot', potIndex),
    kind: 'pot',
    label: getMonteCarloPotLabel(pots, potIndex, translate),
    color: getMonteCarloPotColor(potIndex),
  }));
  // Only streams that pay something in this run get a series
  const incomeSeries: MonteCarloCashflowSeries[] = incomeStreams.flatMap(
    (incomeStream, incomeIndex) =>
      rows.some(row => (row.incomeAmounts[incomeIndex] ?? 0) !== 0)
        ? [
            {
              key: seriesKey('income', incomeIndex),
              kind: 'income',
              label:
                incomeStream.name ||
                translate('Income {{number}}', { number: incomeIndex + 1 }),
              color: inflowColor(pots.length + incomeIndex),
            } satisfies MonteCarloCashflowSeries,
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
          translate('Phase {{number}}', {
            number: configuredIndex === -1 ? 1 : configuredIndex + 1,
          }),
        color: outflowColor(phaseIndex),
      };
    },
  );
  const taxSeries: MonteCarloCashflowSeries = {
    key: seriesKey('tax', 0),
    kind: 'tax',
    label: translate('Tax'),
    color: theme.reportsNumberNegative,
  };
  // Only contributions that deposit something in this run get a series
  const contributionSeries: MonteCarloCashflowSeries[] = contributions.flatMap(
    (contribution, contributionIndex) =>
      rows.some(row => (row.contributionAmounts[contributionIndex] ?? 0) !== 0)
        ? [
            {
              key: seriesKey('contribution', contributionIndex),
              kind: 'contribution',
              label:
                contribution.name ||
                translate('Contribution {{number}}', {
                  number: contributionIndex + 1,
                }),
              color: outflowColor(phases.length + contributionIndex),
            } satisfies MonteCarloCashflowSeries,
          ]
        : [],
  );

  // Money the plan saved into its surplus pot instead of spending
  const hasSurplus = rows.some(row => row.surplusSaved > 0);
  const surplusSeries: MonteCarloCashflowSeries = {
    key: seriesKey('surplus', 0),
    kind: 'surplus',
    label: translate('Saved into {{pot}}', {
      pot: getMonteCarloSurplusPotLabel(pots, translate),
    }),
    color: outflowColor(phases.length + contributions.length),
  };

  // Only one-offs the run called for get a series (an unfunded one still
  // shows, dimmed, like the spending after a failure)
  const lumpSumSeries: MonteCarloCashflowSeries[] = lumpSums.flatMap(
    (lumpSum, lumpSumIndex) =>
      rows.some(row => (row.lumpSumAmounts[lumpSumIndex] ?? 0) !== 0)
        ? [
            {
              key: seriesKey('lumpSum', lumpSumIndex),
              kind: 'lumpSum',
              label:
                lumpSum.name ||
                translate('One-off {{number}}', { number: lumpSumIndex + 1 }),
              color: outflowColor(
                phases.length + contributions.length + 1 + lumpSumIndex,
              ),
            } satisfies MonteCarloCashflowSeries,
          ]
        : [],
  );

  const inflowSeries = [...potSeries, ...incomeSeries];
  const outflowSeries = [
    ...phaseSeries,
    ...(hasTax ? [taxSeries] : []),
    ...contributionSeries,
    ...(hasSurplus ? [surplusSeries] : []),
    ...lumpSumSeries,
  ];

  // Tax sits between the inflows and Spending so the deduction chain
  // reads in order: gross in, minus tax, leaves spending
  const tooltipGroups: MonteCarloCashflowTooltipGroup[] = [
    {
      key: 'withdrawals',
      heading: translate('Withdrawals'),
      series: potSeries,
      listMembers: true,
    },
    ...(incomeSeries.length > 0
      ? [
          {
            key: 'income',
            heading: translate('Income'),
            series: incomeSeries,
            listMembers: true,
          },
        ]
      : []),
    ...(hasTax
      ? [
          {
            key: 'tax',
            heading: translate('Tax'),
            series: [taxSeries],
            listMembers: false,
          },
        ]
      : []),
    {
      key: 'spending',
      heading: translate('Spending'),
      series: phaseSeries,
      listMembers: true,
    },
    ...(contributionSeries.length > 0
      ? [
          {
            key: 'contributions',
            heading: translate('Contributions'),
            series: contributionSeries,
            listMembers: true,
          },
        ]
      : []),
    ...(hasSurplus
      ? [
          {
            key: 'surplus',
            heading: translate('Saved'),
            series: [surplusSeries],
            listMembers: false,
          },
        ]
      : []),
    ...(lumpSumSeries.length > 0
      ? [
          {
            key: 'lumpSums',
            heading: translate('One-off withdrawals'),
            series: lumpSumSeries,
            listMembers: true,
          },
        ]
      : []),
  ];

  const data = rows.map((row): MonteCarloCashflowDataPoint => {
    const age = startAge + row.year - 1;
    const amounts: Record<string, number> = {};
    potSeries.forEach((series, potIndex) => {
      amounts[series.key] =
        (row.potWithdrawals[potIndex] ?? 0) + (row.potLumpSums[potIndex] ?? 0);
    });
    incomeStreams.forEach((_, incomeIndex) => {
      amounts[seriesKey('income', incomeIndex)] =
        row.incomeAmounts[incomeIndex] ?? 0;
    });
    // The year's planned spend belongs to whichever phase is active
    const activePhase = getActiveSpendingPhase(phases, age);
    phaseSeries.forEach((series, phaseIndex) => {
      amounts[series.key] =
        phases[phaseIndex] === activePhase ? -row.plannedSpending : 0;
    });
    if (hasTax) {
      const tax = row.taxPaid + row.incomeTax + row.lumpSumTax;
      // Stacked below zero; a plain 0 (not -0) in an untaxed year
      amounts[taxSeries.key] = tax > 0 ? -tax : 0;
    }
    contributions.forEach((_, contributionIndex) => {
      const deposited = row.contributionAmounts[contributionIndex] ?? 0;
      // Stacked below zero; a plain 0 (not -0) when nothing was paid in
      amounts[seriesKey('contribution', contributionIndex)] =
        deposited > 0 ? -deposited : 0;
    });
    if (hasSurplus) {
      amounts[surplusSeries.key] = row.surplusSaved > 0 ? -row.surplusSaved : 0;
    }
    lumpSumSeries.forEach(series => {
      const lumpSumIndex = Number(series.key.slice('lumpSum'.length));
      const received = row.lumpSumAmounts[lumpSumIndex] ?? 0;
      amounts[series.key] = received > 0 ? -received : 0;
    });
    return {
      year: row.year,
      age,
      afterDepletion: row.afterDepletion === true,
      // Only income that actually left the plan counts as unspent
      unspentIncome: row.surplusSaved > 0 ? 0 : row.unspentIncome,
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
