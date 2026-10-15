import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { WITHDRAWAL_RULE_DEFAULTS } from './monteCarloSimulation';
import type { MonteCarloRunDetailRow } from './monteCarloSimulation';
import { buildMonteCarloYearStory } from './monteCarloYearStory';

// Identity translation that fills in the placeholders, so the tests read
// the English sentences the UI shows
const translate = ((key: string, options?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
    String(options?.[name]),
  )) as unknown as TFunction;

const format = (amount: number) => amount.toFixed(2);

function makeRow(
  overrides: Partial<MonteCarloRunDetailRow> = {},
): MonteCarloRunDetailRow {
  return {
    year: 1,
    startBalance: 100_000,
    withdrawal: 4_000,
    plannedSpending: 4_000,
    spent: 4_000,
    growth: 0,
    endBalance: 96_000,
    potBalances: [96_000],
    potStartBalances: [100_000],
    inflation: null,
    income: 0,
    incomeAmounts: [],
    incomeTax: 0,
    unspentIncome: 0,
    surplusSaved: 0,
    contributions: 0,
    potContributions: [0],
    contributionAmounts: [],
    potWithdrawals: [4_000],
    potTaxes: [0],
    potTaxables: [0],
    taxPaid: 0,
    feesPaid: 0,
    potFees: [0],
    potReturns: [0],
    ...overrides,
  };
}

function story(
  row: MonteCarloRunDetailRow,
  options: {
    hasSurplusPot?: boolean;
    withdrawalRule?: typeof WITHDRAWAL_RULE_DEFAULTS;
  } = {},
) {
  return buildMonteCarloYearStory({
    row,
    withdrawalRule: options.withdrawalRule ?? WITHDRAWAL_RULE_DEFAULTS,
    surplusPotName: 'Surplus cash',
    hasSurplusPot: options.hasSurplusPot ?? false,
    format,
    translate,
  });
}

describe('buildMonteCarloYearStory', () => {
  it('chains a guardrails cut and the spending floor that overrode it', () => {
    // The screenshot year: 40,000 planned, cut by 25% to 16,875, then
    // lifted to the 20,000 minimum spending
    const row = makeRow({
      withdrawal: 20_000,
      plannedSpending: 20_000,
      spent: 20_000,
      minimumApplied: true,
      ruleExplanation: {
        kind: 'factor',
        rule: 'guardrails',
        factor: 0.75,
        planned: 40_000,
        adjusted: 16_875,
        action: 'cut',
        currentRate: 0.082,
        referenceRate: 0.0714,
      },
    });
    expect(story(row, { hasSurplusPot: true })).toEqual([
      "Guardrails cut this year's spending from 40000.00 to 16875.00 because the withdrawal rate had climbed too far above the plan.",
      'The minimum spending floor then lifted it to 20000.00.',
      'Spent 20000.00 as planned, funded from the pots.',
    ]);
  });

  it('keeps a plain year to one sentence', () => {
    expect(story(makeRow())).toEqual([
      'Spent 4000.00 as planned, funded from the pots.',
    ]);
  });

  it('says nothing about a rule that made no change', () => {
    const row = makeRow({
      ruleExplanation: {
        kind: 'factor',
        rule: 'guardrails',
        factor: 1,
        planned: 4_000,
        adjusted: 4_000,
        action: 'none',
      },
    });
    expect(story(row)).toEqual([
      'Spent 4000.00 as planned, funded from the pots.',
    ]);
  });

  it('explains earlier adjustments that still apply', () => {
    const row = makeRow({
      withdrawal: 3_600,
      plannedSpending: 3_600,
      spent: 3_600,
      ruleExplanation: {
        kind: 'factor',
        rule: 'boundaries',
        factor: 0.9,
        planned: 4_000,
        adjusted: 3_600,
        action: 'none',
      },
    });
    expect(story(row)[0]).toBe(
      "Earlier Boundaries changes still applied, so this year's spending was 3600.00 instead of the 4000.00 planned.",
    );
  });

  it('quotes the boundary and ratchet settings the rule tripped', () => {
    const boundariesCut = makeRow({
      ruleExplanation: {
        kind: 'factor',
        rule: 'boundaries',
        factor: 0.9,
        planned: 4_000,
        adjusted: 3_600,
        action: 'cut',
        currentRate: 0.07,
      },
    });
    expect(story(boundariesCut)[0]).toBe(
      "Boundaries cut this year's spending from 4000.00 to 3600.00 because the withdrawal rate rose above 6%.",
    );

    const ratchetRaise = makeRow({
      ruleExplanation: {
        kind: 'factor',
        rule: 'ratcheting',
        factor: 1.05,
        planned: 4_000,
        adjusted: 4_200,
        action: 'raise',
        ratchetStreak: 3,
      },
    });
    expect(story(ratchetRaise)[0]).toBe(
      "Ratcheting raised this year's spending from 4000.00 to 4200.00 because the balance had stayed above 1.5× its starting level for 3 years.",
    );
  });

  it('describes floor & ceiling only when a bound applied', () => {
    const floorApplied = makeRow({
      ruleExplanation: {
        kind: 'floor-ceiling',
        rate: 0.04,
        unclamped: 3_000,
        floor: 3_400,
        ceiling: 4_800,
        applied: 'floor',
      },
    });
    expect(story(floorApplied)[0]).toBe(
      'Floor & ceiling held spending at 3400.00 - the rate-based amount (3000.00) fell below the floor.',
    );

    const withinBounds = makeRow({
      ruleExplanation: {
        kind: 'floor-ceiling',
        rate: 0.04,
        unclamped: 4_000,
        floor: 3_400,
        ceiling: 4_800,
        applied: 'rate',
      },
    });
    expect(story(withinBounds)).toHaveLength(1);

    const anchor = makeRow({ ruleExplanation: { kind: 'anchor', rate: 0.04 } });
    expect(story(anchor)[0]).toBe(
      "This is the first spending year, so the plan's withdrawal rate was set here.",
    );
  });

  it('phrases the floor on its own when no rule sentence precedes it', () => {
    const row = makeRow({
      withdrawal: 5_000,
      plannedSpending: 5_000,
      spent: 5_000,
      minimumApplied: true,
    });
    expect(story(row)).toEqual([
      "The minimum spending floor set this year's spending at 5000.00.",
      'Spent 5000.00 as planned, funded from the pots.',
    ]);
  });

  it('credits income for the part of spending it covered', () => {
    const partly = makeRow({
      income: 1_000,
      incomeAmounts: [1_000],
      withdrawal: 3_000,
      potWithdrawals: [3_000],
    });
    expect(story(partly)).toEqual([
      'Income covered 1000.00 of the 4000.00 spent; withdrawals covered the rest.',
    ]);

    const fully = makeRow({
      income: 5_000,
      incomeAmounts: [5_000],
      withdrawal: 0,
      potWithdrawals: [0],
      unspentIncome: 1_000,
    });
    expect(story(fully)).toEqual([
      'Income covered all of the 4000.00 spent, so nothing had to come from the pots.',
      '1000.00 of income beyond the plan went unspent and left the plan.',
    ]);
    // With a surplus pot the engine saves that 1,000 instead
    expect(
      story({ ...fully, surplusSaved: 1_000 }, { hasSurplusPot: true })[1],
    ).toBe('1000.00 of income beyond the plan was saved into Surplus cash.');
  });

  it('says where income went when contributions took it', () => {
    // The user's year 66: 12,547.60 income, all paid into the cash pot
    const allContributed = makeRow({
      income: 12_547.6,
      incomeAmounts: [12_547.6],
      contributions: 12_547.6,
      withdrawal: 24_282.41,
      taxPaid: 4_282.41,
      plannedSpending: 20_000,
      spent: 20_000,
    });
    expect(story(allContributed, { hasSurplusPot: true })).toEqual([
      'The 12547.60 income all went into contributions, so the 20000.00 spent came from the pots.',
    ]);

    const partlyContributed = makeRow({
      income: 3_000,
      incomeAmounts: [3_000],
      contributions: 2_000,
      withdrawal: 3_000,
      potWithdrawals: [3_000],
    });
    expect(story(partlyContributed)).toEqual([
      'Income covered 1000.00 of the 4000.00 spent, with another 2000.00 of it going into contributions; withdrawals covered the rest.',
    ]);
  });

  it('nets tax out of the withdrawal when crediting income', () => {
    const row = makeRow({
      income: 1_000,
      incomeAmounts: [1_000],
      withdrawal: 3_750,
      taxPaid: 750,
      potWithdrawals: [3_750],
    });
    expect(story(row)[0]).toBe(
      'Income covered 1000.00 of the 4000.00 spent; withdrawals covered the rest.',
    );
  });

  it('reports a shortfall and any locked money', () => {
    const row = makeRow({
      withdrawal: 1_500,
      spent: 1_500,
      inaccessibleBalance: 80_000,
    });
    expect(story(row)).toEqual([
      'Only 1500.00 of the 4000.00 planned could be funded - the plan ran out of accessible money here.',
      '80000.00 was still locked in pots that had not reached their access age.',
    ]);
  });
});
