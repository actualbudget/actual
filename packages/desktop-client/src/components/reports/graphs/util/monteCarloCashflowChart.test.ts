import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import type {
  MonteCarloContribution,
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
    growth: 0,
    endBalance: 0,
    potBalances: [],
    potStartBalances: [],
    inflation: null,
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
const phases = [makePhase('phase-1', null, 'Early'), makePhase('phase-2', 62)];

describe('buildMonteCarloCashflowChart', () => {
  it('builds one series per pot, active contribution and phase', () => {
    const rows = [
      makeRow({
        year: 1,
        potWithdrawals: [30_000, 10_000],
        contributionAmounts: [5_000, 0],
        plannedSpending: 38_000,
        taxPaid: 2_000,
      }),
    ];
    const chart = buildMonteCarloCashflowChart({
      rows,
      pots,
      contributions,
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    expect(
      chart.inflowSeries.map(series => [series.kind, series.label]),
    ).toEqual([
      ['pot', 'Pension'],
      ['pot', 'Pot 2'],
      // The second contribution never deposits anything, so no series
      ['contribution', 'Salary sacrifice'],
    ]);
    expect(
      chart.outflowSeries.map(series => [series.kind, series.label]),
    ).toEqual([
      ['phase', 'Early'],
      ['phase', 'Phase 2'],
      ['tax', 'Tax'],
    ]);
    expect(chart.tooltipGroups.map(group => group.key)).toEqual([
      'withdrawals',
      'contributions',
      'tax',
      'spending',
    ]);

    const [point] = chart.data;
    expect(point.age).toBe(60);
    expect(point.afterDepletion).toBe(false);
    expect(point.amounts).toEqual({
      pot0: 30_000,
      pot1: 10_000,
      contribution0: 5_000,
      contribution1: 0,
      // Age 60 is before phase 2 starts, so the plan belongs to phase 1
      phase0: -38_000,
      phase1: 0,
      tax0: -2_000,
    });
    expect(chart.stackExtents).toEqual([45_000, -40_000]);
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

  it('omits tax and contribution groups when nothing was paid', () => {
    const chart = buildMonteCarloCashflowChart({
      rows: [makeRow({ year: 1, potWithdrawals: [100, 0] })],
      pots,
      contributions,
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    expect(chart.outflowSeries.map(series => series.kind)).toEqual([
      'phase',
      'phase',
    ]);
    expect(chart.tooltipGroups.map(group => group.key)).toEqual([
      'withdrawals',
      'spending',
    ]);
  });

  it('falls back to a single phase when none are configured', () => {
    const chart = buildMonteCarloCashflowChart({
      rows: [makeRow({ year: 1, plannedSpending: 500 })],
      pots,
      contributions: [],
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

  it('flags the synthetic years after a failure', () => {
    const chart = buildMonteCarloCashflowChart({
      rows: [
        makeRow({ year: 1, plannedSpending: 100 }),
        makeRow({ year: 2, plannedSpending: 100, afterDepletion: true }),
      ],
      pots,
      contributions: [],
      spendingPhases: phases,
      startAge: 60,
      translate,
    });

    expect(chart.data.map(point => point.afterDepletion)).toEqual([
      false,
      true,
    ]);
  });
});
