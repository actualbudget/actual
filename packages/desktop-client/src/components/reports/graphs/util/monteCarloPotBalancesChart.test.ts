import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import type {
  MonteCarloPot,
  MonteCarloRunDetailRow,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';

import { getMonteCarloPotColor } from './monteCarloCashflowChart';
import { buildMonteCarloPotBalancesChart } from './monteCarloPotBalancesChart';

// Interpolates like i18next so labels can be asserted literally
const translate = ((key: string, options?: Record<string, unknown>) =>
  key.replace(/{{\w+}}/g, placeholder => {
    const name = placeholder.slice('{{'.length, -'}}'.length);
    return String(options?.[name]);
  })) as unknown as TFunction;

function makePot(id: string, name = '', isSurplus = false): MonteCarloPot {
  return {
    id,
    name,
    startingBalance: 0,
    allocationPreset: 'custom',
    allocationStocks: 0.6,
    allocationBonds: 0.4,
    allocationCash: 0,
    expectedReturnMean: 0,
    returnStdDev: 0,
    accessAge: null,
    accountId: null,
    withdrawalTaxRate: 0,
    taxableFraction: 1,
    annualFeeFixed: 0,
    feeAdjustsWithInflation: false,
    annualFeeRate: 0,
    isSurplus,
  };
}

function makeRow(
  overrides: Partial<MonteCarloRunDetailRow> & { year: number },
): MonteCarloRunDetailRow {
  return {
    startBalance: 0,
    withdrawal: 0,
    plannedSpending: 0,
    spent: 0,
    growth: 0,
    endBalance: 0,
    potBalances: [],
    potStartBalances: [],
    inflation: null,
    income: 0,
    incomeAmounts: [],
    incomeTax: 0,
    unspentIncome: 0,
    surplusSaved: 0,
    contributions: 0,
    potContributions: [],
    contributionAmounts: [],
    potWithdrawals: [],
    potTaxes: [],
    potTaxables: [],
    taxPaid: 0,
    feesPaid: 0,
    potFees: [],
    potReturns: [],
    ...overrides,
  };
}

const pots = [
  makePot('surplus', '', true),
  makePot('pot-1', 'Pension'),
  makePot('pot-2'),
];

describe('buildMonteCarloPotBalancesChart', () => {
  it('builds one series per pot, named and coloured like the cashflow chart', () => {
    const { series } = buildMonteCarloPotBalancesChart({
      rows: [],
      pots,
      startAge: 60,
      translate,
    });
    expect(series.map(entry => entry.label)).toEqual([
      'Surplus cash',
      'Pension',
      'Pot 2',
    ]);
    expect(series.map(entry => entry.color)).toEqual([
      getMonteCarloPotColor(0),
      getMonteCarloPotColor(1),
      getMonteCarloPotColor(2),
    ]);
    expect(series.every(entry => entry.kind === 'pot')).toBe(true);
  });

  it('charts each year as the pots end-of-year balances with their total', () => {
    const { data, totals, tooltipGroups } = buildMonteCarloPotBalancesChart({
      rows: [
        makeRow({ year: 1, potBalances: [0, 90_000, 10_000] }),
        makeRow({ year: 2, potBalances: [500, 80_000, 0] }),
      ],
      pots,
      startAge: 60,
      translate,
    });
    expect(data.map(point => point.age)).toEqual([60, 61]);
    expect(data[0].amounts).toEqual({
      'pot-0': 0,
      'pot-1': 90_000,
      'pot-2': 10_000,
    });
    expect(data[1].amounts).toEqual({
      'pot-0': 500,
      'pot-1': 80_000,
      'pot-2': 0,
    });
    expect(totals).toEqual([100_000, 80_500]);
    expect(data.every(point => point.unspentIncome === 0)).toBe(true);
    expect(tooltipGroups).toHaveLength(1);
    expect(tooltipGroups[0].heading).toBe('Total');
    expect(tooltipGroups[0].listMembers).toBe(true);
    expect(tooltipGroups[0].series).toHaveLength(3);
  });

  it('carries the years after a failure as empty, flagged points', () => {
    const { data, totals } = buildMonteCarloPotBalancesChart({
      rows: [
        makeRow({ year: 1, potBalances: [0, 5_000, 0] }),
        makeRow({ year: 2, potBalances: [0, 0, 0] }),
        makeRow({ year: 3, afterDepletion: true, potBalances: [0, 0, 0] }),
      ],
      pots,
      startAge: 60,
      translate,
    });
    expect(data.map(point => point.afterDepletion)).toEqual([
      false,
      false,
      true,
    ]);
    expect(totals).toEqual([5_000, 0, 0]);
  });

  it('treats a missing pot balance as zero', () => {
    const { data } = buildMonteCarloPotBalancesChart({
      rows: [makeRow({ year: 1, potBalances: [0, 1_000] })],
      pots,
      startAge: 60,
      translate,
    });
    expect(data[0].amounts['pot-2']).toBe(0);
  });
});
