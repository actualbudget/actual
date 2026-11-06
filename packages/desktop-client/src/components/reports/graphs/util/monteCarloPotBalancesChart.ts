import type { TFunction } from 'i18next';

import { getMonteCarloPotColor } from '#components/reports/graphs/util/monteCarloCashflowChart';
import type {
  MonteCarloCashflowDataPoint,
  MonteCarloCashflowSeries,
  MonteCarloCashflowTooltipGroup,
} from '#components/reports/graphs/util/monteCarloCashflowChart';
import { getMonteCarloPotLabel } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloPot,
  MonteCarloRunDetailRow,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';

export type MonteCarloPotBalancesChart = {
  /** One point per simulated year; amounts hold each pot's end-of-year balance */
  data: MonteCarloCashflowDataPoint[];
  /** One stacked series per pot, in the order the pots are configured */
  series: MonteCarloCashflowSeries[];
  /** A single group listing every pot under the year's total */
  tooltipGroups: MonteCarloCashflowTooltipGroup[];
  /** Each year's total balance, for axis padding */
  totals: number[];
};

type BuildMonteCarloPotBalancesChartInput = {
  /** The captured run to chart, one row per simulated year */
  rows: MonteCarloRunDetailRow[];
  pots: MonteCarloPot[];
  /** The user's current age; the x-axis shows startAge + year - 1 */
  startAge: number;
  translate: TFunction;
};

/**
 * What every pot was worth at the end of each year of a single simulated
 * run, shaped for stacked areas. Reuses the cashflow chart's point and
 * series shapes so its tooltip and legend serve both charts. Every pot
 * gets a series even when it stays empty, so the legend matches the pots
 * list; the synthetic years after a failure carry zero balances
 */
export function buildMonteCarloPotBalancesChart({
  rows,
  pots,
  startAge,
  translate,
}: BuildMonteCarloPotBalancesChartInput): MonteCarloPotBalancesChart {
  const series = pots.map(
    (pot, potIndex) =>
      ({
        key: `pot-${potIndex}`,
        kind: 'pot',
        label: getMonteCarloPotLabel(pots, potIndex, translate),
        color: getMonteCarloPotColor(potIndex),
      }) satisfies MonteCarloCashflowSeries,
  );

  const data = rows.map(row => {
    const amounts: Record<string, number> = {};
    series.forEach((potSeries, potIndex) => {
      amounts[potSeries.key] = row.potBalances[potIndex] ?? 0;
    });
    return {
      year: row.year,
      age: startAge + row.year - 1,
      afterDepletion: row.afterDepletion === true,
      unspentIncome: 0,
      amounts,
    } satisfies MonteCarloCashflowDataPoint;
  });

  const totals = data.map(point =>
    Object.values(point.amounts).reduce((sum, amount) => sum + amount, 0),
  );

  const tooltipGroups: MonteCarloCashflowTooltipGroup[] = [
    { key: 'pots', heading: translate('Total'), series, listMembers: true },
  ];

  return { data, series, tooltipGroups, totals };
}
