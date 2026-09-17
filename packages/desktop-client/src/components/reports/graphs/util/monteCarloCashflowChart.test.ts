import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import type {
  MonteCarloContribution,
  MonteCarloIncomeStream,
  MonteCarloPot,
  MonteCarloRunDetailRow,
  MonteCarloSpendingPhase,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';

import { buildMonteCarloCashflowChart } from './monteCarloCashflowChart';

// Interpolates like i18next so labels can be asserted literally
const translate = ((key: string, options?: Record<string, unknown>) =>
  key.replace(/{{\w+}}/g, placeholder => {
    const name = placeholder.slice('{{'.length, -'}}'.length);
    return String(options?.[name]);
  })) as unknown as TFunction;

function makePot(id: string, name = ''): MonteCarloPot {
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
    isSurplus: false,
  };
}

function makeContribution(id: string, name = ''): MonteCarloContribution {
  return {
    id,
    name,
    potId: 'pot-1',
    fromAge: null,
    toAge: null,
    annualAmount: 0,
    adjustsWithInflation: false,
    sourceIncomeStreamId: null,
    beforeTax: false,
  };
}

function makeIncomeStream(id: string, name = ''): MonteCarloIncomeStream {
  return {
    id,
    name,
    fromAge: null,
    toAge: null,
    annualAmount: 0,
    adjustsWithInflation: false,
    taxRate: 0,
    taxableFraction: 1,
  };
}

function makePhase(
  id: string,
  fromAge: number | null,
  name = '',
): MonteCarloSpendingPhase {
  return { id, name, fromAge, annualWithdrawal: 0 };
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

const pots = [makePot('pot-1', 'Pension'), makePot('pot-2')];
const contributions = [
  makeContribution('contribution-1', 'Salary sacrifice'),
  makeContribution('contribution-2'),
];
const incomeStreams = [
  makeIncomeStream('income-1', 'State pension'),
  makeIncomeStream('income-2'),
];
const phases = [makePhase('phase-1', null, 'Early'), makePhase('phase-2', 62)];

describe('buildMonteCarloCashflowChart', () => {
  it('builds one series per pot, active income, phase and active contribution', () => {
    const rows = [
      makeRow({
        year: 1,
        potWithdrawals: [30_000, 10_000],
        incomeAmounts: [12_000, 0],
        incomeTax: 500,
        contributionAmounts: [5_000, 0],
        plannedSpending: 38_000,
        taxPaid: 2_000,
      }),
    ];
    const chart = buildMonteCarloCashflowChart({
      rows,
      pots,
      contributions,
      incomeStreams,
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    expect(
      chart.inflowSeries.map(series => [series.kind, series.label]),
    ).toEqual([
      ['pot', 'Pension'],
      ['pot', 'Pot 2'],
      // The second stream never pays anything, so no series
      ['income', 'State pension'],
    ]);
    expect(
      chart.outflowSeries.map(series => [series.kind, series.label]),
    ).toEqual([
      ['phase', 'Early'],
      ['phase', 'Phase 2'],
      ['tax', 'Tax'],
      // The second contribution never deposits anything, so no series
      ['contribution', 'Salary sacrifice'],
    ]);
    expect(chart.tooltipGroups.map(group => group.key)).toEqual([
      'withdrawals',
      'income',
      'tax',
      'spending',
      'contributions',
    ]);

    const [point] = chart.data;
    expect(point.age).toBe(60);
    expect(point.afterDepletion).toBe(false);
    expect(point.amounts).toEqual({
      pot0: 30_000,
      pot1: 10_000,
      income0: 12_000,
      income1: 0,
      // Age 60 is before phase 2 starts, so the plan belongs to phase 1
      phase0: -38_000,
      phase1: 0,
      // Tax on withdrawals and on income together
      tax0: -2_500,
      contribution0: -5_000,
      contribution1: 0,
    });
    expect(chart.stackExtents).toEqual([52_000, -45_500]);
  });

  it('attributes each year to the phase active at that age', () => {
    const rows = [
      makeRow({ year: 1, plannedSpending: 100 }),
      makeRow({ year: 2, plannedSpending: 200 }),
      makeRow({ year: 3, plannedSpending: 300 }),
    ];
    const chart = buildMonteCarloCashflowChart({
      rows,
      pots,
      contributions: [],
      incomeStreams: [],
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    // Ages 60, 61 fall in phase 1; age 62 switches to phase 2
    expect(
      chart.data.map(point => [point.amounts.phase0, point.amounts.phase1]),
    ).toEqual([
      [-100, 0],
      [-200, 0],
      [0, -300],
    ]);
  });

  it('omits tax, income and contribution groups when nothing moved', () => {
    const chart = buildMonteCarloCashflowChart({
      rows: [makeRow({ year: 1, potWithdrawals: [100, 0] })],
      pots,
      contributions,
      incomeStreams,
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    expect(chart.inflowSeries.map(series => series.kind)).toEqual([
      'pot',
      'pot',
    ]);
    expect(chart.outflowSeries.map(series => series.kind)).toEqual([
      'phase',
      'phase',
    ]);
    expect(chart.tooltipGroups.map(group => group.key)).toEqual([
      'withdrawals',
      'spending',
    ]);
  });

  it('shows the tax group for income tax alone', () => {
    const chart = buildMonteCarloCashflowChart({
      rows: [makeRow({ year: 1, incomeAmounts: [1_000, 0], incomeTax: 200 })],
      pots,
      contributions: [],
      incomeStreams,
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    expect(chart.tooltipGroups.map(group => group.key)).toEqual([
      'withdrawals',
      'income',
      'tax',
      'spending',
    ]);
    expect(chart.data[0].amounts.tax0).toBe(-200);
  });

  it('falls back to a single phase when none are configured', () => {
    const chart = buildMonteCarloCashflowChart({
      rows: [makeRow({ year: 1, plannedSpending: 500 })],
      pots,
      contributions: [],
      incomeStreams: [],
      spendingPhases: [],
      startAge: 60,
      translate,
    });

    expect(chart.outflowSeries.map(series => series.label)).toEqual([
      'Phase 1',
    ]);
    expect(chart.data[0].amounts.phase0).toBe(-500);
  });

  it('numbers unnamed phases as the editor lists them', () => {
    // Configured out of age order: the later-starting phase comes first
    const chart = buildMonteCarloCashflowChart({
      rows: [],
      pots,
      contributions: [],
      incomeStreams: [],
      spendingPhases: [makePhase('late', 70), makePhase('early', null)],
      startAge: 60,
      translate,
    });

    // Resolved (age) order is early, late - but labels keep editor numbers
    expect(chart.outflowSeries.map(series => series.label)).toEqual([
      'Phase 2',
      'Phase 1',
    ]);
  });

  it('shows money saved into the surplus pot as an outflow', () => {
    const surplusPot = { ...makePot('surplus', 'Rainy day'), isSurplus: true };
    const chart = buildMonteCarloCashflowChart({
      rows: [
        makeRow({
          year: 1,
          incomeAmounts: [1_000, 0],
          unspentIncome: 600,
          surplusSaved: 600,
        }),
      ],
      pots: [surplusPot, ...pots],
      contributions: [],
      incomeStreams,
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    const surplusSeries = chart.outflowSeries.find(
      series => series.kind === 'surplus',
    );
    expect(surplusSeries?.label).toBe('Saved into Rainy day');
    expect(chart.tooltipGroups.map(group => group.key)).toEqual([
      'withdrawals',
      'income',
      'spending',
      'surplus',
    ]);
    expect(chart.data[0].amounts.surplus0).toBe(-600);
    // Saved money isn't unspent
    expect(chart.data[0].unspentIncome).toBe(0);
  });

  it('carries the unfunded and unspent flags for the tooltip', () => {
    const chart = buildMonteCarloCashflowChart({
      rows: [
        makeRow({ year: 1, plannedSpending: 100, unspentIncome: 250 }),
        makeRow({ year: 2, plannedSpending: 100, afterDepletion: true }),
      ],
      pots,
      contributions: [],
      incomeStreams: [],
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    expect(chart.data.map(point => point.afterDepletion)).toEqual([
      false,
      true,
    ]);
    expect(chart.data.map(point => point.unspentIncome)).toEqual([250, 0]);
  });
});
