import { describe, expect, it } from 'vitest';

import {
  getMonteCarloHorizonYears,
  MAX_AMOUNT,
  MAX_HORIZON_YEARS,
  MIN_HORIZON_YEARS,
  MIN_SIMULATION_COUNT,
  runMonteCarloSimulation,
  WITHDRAWAL_RULE_DEFAULTS,
} from './monteCarloSimulation';
import type {
  MonteCarloContribution,
  MonteCarloParams,
  MonteCarloPot,
} from './monteCarloSimulation';

function makeContribution(
  overrides: Partial<MonteCarloContribution> = {},
): MonteCarloContribution {
  return {
    id: 'contribution-1',
    name: 'Test contribution',
    potId: 'pot-1',
    fromAge: null,
    toAge: null,
    annualAmount: 1_000_000,
    adjustsWithInflation: false,
    ...overrides,
  };
}

function makePot(overrides: Partial<MonteCarloPot> = {}): MonteCarloPot {
  return {
    id: 'pot-1',
    name: 'Test pot',
    startingBalance: 50_000_000,
    allocationPreset: 'custom',
    expectedReturnMean: 0.06,
    returnStdDev: 0.1,
    accessAge: null,
    accountId: null,
    withdrawalTaxRate: 0,
    taxableFraction: 1,
    annualFeeFixed: 0,
    feeAdjustsWithInflation: false,
    annualFeeRate: 0,
    ...overrides,
  };
}

function makeParams(
  overrides: Partial<MonteCarloParams> & { annualWithdrawal?: number } = {},
  potOverrides: Partial<MonteCarloPot> = {},
): MonteCarloParams {
  // Convenience: a plain annualWithdrawal becomes a single spending phase
  const { annualWithdrawal = 2_000_000, ...rest } = overrides;
  return {
    pots: [makePot(potOverrides)],
    withdrawalStrategy: 'proportional',
    returnModel: 'normal',
    withdrawalRule: WITHDRAWAL_RULE_DEFAULTS,
    minimumWithdrawal: 0,
    currentAge: 60,
    spendingPhases: [
      { id: 'phase-1', name: '', fromAge: null, annualWithdrawal },
    ],
    contributions: [],
    inflationMean: null,
    inflationStdDev: 0,
    taxModel: 'flat',
    taxBands: [],
    horizonYears: 30,
    simulationCount: 1000,
    seed: 42,
    ...rest,
  };
}

// Independent restatement of the deterministic (zero volatility) recurrence:
// withdrawal at the start of each year, then growth on the remainder.
function deterministicDepletionYear(
  startingBalance: number,
  withdrawal: number,
  annualReturn: number,
  inflationRate: number | null,
  horizonYears: number,
) {
  let balance = startingBalance;
  let currentWithdrawal = withdrawal;
  for (let year = 1; year <= horizonYears; year++) {
    balance -= currentWithdrawal;
    if (balance <= 0) {
      return year;
    }
    balance *= 1 + annualReturn;
    if (inflationRate != null) {
      currentWithdrawal *= 1 + inflationRate;
    }
  }
  return null;
}

describe('getMonteCarloHorizonYears', () => {
  it('derives the horizon from the configured ages', () => {
    expect(getMonteCarloHorizonYears({ currentAge: 60, targetAge: 90 })).toBe(
      30,
    );
    expect(getMonteCarloHorizonYears({ currentAge: 62.4, targetAge: 90 })).toBe(
      28,
    );
  });

  it('clamps degenerate and oversized ranges', () => {
    expect(getMonteCarloHorizonYears({ currentAge: 90, targetAge: 60 })).toBe(
      MIN_HORIZON_YEARS,
    );
    expect(getMonteCarloHorizonYears({ currentAge: 70, targetAge: 70 })).toBe(
      MIN_HORIZON_YEARS,
    );
    expect(getMonteCarloHorizonYears({ currentAge: 0, targetAge: 500 })).toBe(
      MAX_HORIZON_YEARS,
    );
  });
});

describe('runMonteCarloSimulation', () => {
  it('matches the closed-form depletion year with zero volatility', () => {
    const params = makeParams(
      { annualWithdrawal: 10_000, horizonYears: 30 },
      {
        startingBalance: 100_000,
        expectedReturnMean: 0.05,
        returnStdDev: 0,
      },
    );
    const expectedYear = deterministicDepletionYear(
      100_000,
      10_000,
      0.05,
      null,
      30,
    );
    expect(expectedYear).not.toBeNull();

    const result = runMonteCarloSimulation(params);

    expect(result.successRate).toBe(0);
    expect(result.medianDepletionYear).toBe(expectedYear);
    expect(result.earliestDepletionYear).toBe(expectedYear);
    expect(result.latestDepletionYear).toBe(expectedYear);

    const histogramEntry = result.depletionHistogram.find(
      entry => entry.count > 0,
    );
    expect(histogramEntry?.year).toBe(expectedYear);
    expect(histogramEntry?.count).toBe(result.simulationCount);
  });

  it('survives the full horizon when returns outpace withdrawals', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 3_000, horizonYears: 30 },
        {
          startingBalance: 100_000,
          expectedReturnMean: 0.05,
          returnStdDev: 0,
        },
      ),
    );

    expect(result.successRate).toBe(1);
    expect(result.medianDepletionYear).toBeNull();
    expect(result.earliestDepletionYear).toBeNull();
    expect(result.depletionHistogram.every(entry => entry.count === 0)).toBe(
      true,
    );
    // Pot should have grown: withdrawals are 3% of a pot earning 5%
    expect(result.medianEndingBalance).toBeGreaterThan(100_000);
  });

  it('always succeeds with no withdrawals', () => {
    const result = runMonteCarloSimulation(
      makeParams({ annualWithdrawal: 0 }, { returnStdDev: 0.2 }),
    );
    expect(result.successRate).toBe(1);
  });

  it('depletes in year one when the withdrawal exceeds the pot', () => {
    const result = runMonteCarloSimulation(
      makeParams({ annualWithdrawal: 20_000 }, { startingBalance: 10_000 }),
    );
    expect(result.successRate).toBe(0);
    expect(result.medianDepletionYear).toBe(1);
    expect(result.depletionHistogram[0]).toEqual({
      year: 1,
      count: result.simulationCount,
    });
  });

  it('grows withdrawals by the inflation rate', () => {
    // pot 200, withdrawal 50, no growth, 100% inflation:
    // y1: 200-50=150 (w -> 100); y2: 150-100=50 (w -> 200); y3: depleted
    const inflated = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 50, inflationMean: 1, horizonYears: 10 },
        {
          startingBalance: 200,
          expectedReturnMean: 0,
          returnStdDev: 0,
        },
      ),
    );
    expect(inflated.medianDepletionYear).toBe(3);

    // Flat withdrawals last one year longer: y4 hits exactly 0
    const flat = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 50, inflationMean: null, horizonYears: 10 },
        {
          startingBalance: 200,
          expectedReturnMean: 0,
          returnStdDev: 0,
        },
      ),
    );
    expect(flat.medianDepletionYear).toBe(4);
  });

  it('is deterministic for a given seed', () => {
    const firstRun = runMonteCarloSimulation(makeParams({ seed: 7 }));
    const secondRun = runMonteCarloSimulation(makeParams({ seed: 7 }));
    expect(firstRun).toEqual(secondRun);

    const differentSeedRun = runMonteCarloSimulation(makeParams({ seed: 8 }));
    expect(differentSeedRun.successRate).not.toBe(firstRun.successRate);
  });

  it('produces ordered percentile bands', () => {
    const result = runMonteCarloSimulation(
      makeParams({}, { returnStdDev: 0.15 }),
    );
    for (const band of result.percentileBands) {
      expect(band.p5).toBeLessThanOrEqual(band.p10);
      expect(band.p10).toBeLessThanOrEqual(band.p25);
      expect(band.p25).toBeLessThanOrEqual(band.p30);
      expect(band.p30).toBeLessThanOrEqual(band.p50);
      expect(band.p50).toBeLessThanOrEqual(band.p70);
      expect(band.p70).toBeLessThanOrEqual(band.p75);
      expect(band.p75).toBeLessThanOrEqual(band.p90);
    }
    expect(result.percentileBands).toHaveLength(result.horizonYears + 1);
    expect(result.percentileBands[0].p10).toBe(50_000_000);
    expect(result.percentileBands[0].p90).toBe(50_000_000);
  });

  it('reports cumulative depletion probability', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 2_500_000 },
        { startingBalance: 30_000_000, returnStdDev: 0.15 },
      ),
    );
    const probabilities = result.depletionProbabilityByYear;
    expect(probabilities[0]).toBe(0);
    for (let year = 1; year < probabilities.length; year++) {
      expect(probabilities[year]).toBeGreaterThanOrEqual(
        probabilities[year - 1],
      );
    }
    expect(probabilities[result.horizonYears]).toBeCloseTo(
      1 - result.successRate,
      10,
    );
  });

  it('tracks the single worst run', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 2_500_000 },
        { startingBalance: 30_000_000, returnStdDev: 0.15 },
      ),
    );
    expect(result.worstRunPath).toHaveLength(result.horizonYears + 1);
    expect(result.worstRunPath[0]).toBe(30_000_000);

    // The worst run is the one that depletes earliest: its path hits zero
    // exactly at the earliest depletion year and stays there
    const firstZeroYear = result.worstRunPath.findIndex(
      balance => balance === 0,
    );
    expect(firstZeroYear).toBe(result.earliestDepletionYear);
    for (let year = firstZeroYear; year < result.worstRunPath.length; year++) {
      expect(result.worstRunPath[year]).toBe(0);
    }
  });

  it('treats two identical half-size pots the same as one pot', () => {
    // Holds even with volatility, since all pots share each year's market
    // shock
    for (const returnStdDev of [0, 0.15]) {
      const singlePot = runMonteCarloSimulation(
        makeParams({}, { startingBalance: 50_000_000, returnStdDev }),
      );

      for (const strategy of ['proportional', 'sequential'] as const) {
        const twoPots = runMonteCarloSimulation(
          makeParams({
            withdrawalStrategy: strategy,
            pots: [
              makePot({
                id: 'a',
                startingBalance: 25_000_000,
                returnStdDev,
              }),
              makePot({
                id: 'b',
                startingBalance: 25_000_000,
                returnStdDev,
              }),
            ],
          }),
        );

        expect(twoPots.successRate).toBe(singlePot.successRate);
        expect(twoPots.medianEndingBalance).toBe(singlePot.medianEndingBalance);
        expect(twoPots.percentileBands).toEqual(singlePot.percentileBands);
      }
    }
  });

  it('gives identically-invested pots identical yearly returns', () => {
    const result = runMonteCarloSimulation(
      makeParams({
        captureRunDetail: 7,
        pots: [
          makePot({ id: 'isa', startingBalance: 25_000_000 }),
          makePot({ id: 'pension', startingBalance: 25_000_000 }),
        ],
      }),
    );

    const rows = result.runDetail!;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      if (row.potReturns[0] != null && row.potReturns[1] != null) {
        expect(row.potReturns[0]).toBe(row.potReturns[1]);
      }
    }
  });

  it('applies the withdrawal strategy across pots', () => {
    // Two pots of 100 each, withdrawal 50/year over 2 years, no volatility.
    // Pot A earns 0%, pot B earns 100%.
    const pots = [
      makePot({
        id: 'a',
        startingBalance: 100,
        expectedReturnMean: 0,
        returnStdDev: 0,
      }),
      makePot({
        id: 'b',
        startingBalance: 100,
        expectedReturnMean: 1,
        returnStdDev: 0,
      }),
    ];

    // Sequential drains pot A first, leaving pot B compounding untouched:
    // y1: A 100-50=50, B 100*2=200; y2: A 0, B 200*2=400 -> total 400
    const sequential = runMonteCarloSimulation(
      makeParams({
        pots,
        withdrawalStrategy: 'sequential',
        annualWithdrawal: 50,
        horizonYears: 2,
      }),
    );
    expect(sequential.medianEndingBalance).toBe(400);

    // Proportional takes some from the growing pot each year:
    // y1: A 75, B 75*2=150 (total 225); y2: factor 1-50/225,
    // A 58.33, B 116.67*2=233.33 -> total ~292
    const proportional = runMonteCarloSimulation(
      makeParams({
        pots,
        withdrawalStrategy: 'proportional',
        annualWithdrawal: 50,
        horizonYears: 2,
      }),
    );
    expect(proportional.medianEndingBalance).toBe(292);

    // Draining the low-return pot first should always come out ahead here
    expect(sequential.medianEndingBalance).toBeGreaterThan(
      proportional.medianEndingBalance,
    );
  });

  it('matches deterministic growth when bootstrapping a one-year history', () => {
    // With a single historical year, every bootstrap draw is that year's
    // return, so the run must match a zero-volatility 5% projection
    const historical = runMonteCarloSimulation(
      makeParams(
        {
          returnModel: 'historical-bootstrap',
          historicalReturns: [
            { year: 2000, stocks: 0.05, bonds: 0.02, cash: 0.01 },
          ],
          annualWithdrawal: 3_000,
          horizonYears: 30,
        },
        { startingBalance: 100_000, allocationPreset: 'equity-100' },
      ),
    );
    const deterministic = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 3_000, horizonYears: 30 },
        {
          startingBalance: 100_000,
          expectedReturnMean: 0.05,
          returnStdDev: 0,
        },
      ),
    );
    expect(historical.percentileBands).toEqual(deterministic.percentileBands);
  });

  it('runs one scenario per start year in sequence mode', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        {
          returnModel: 'historical-sequence',
          historicalReturns: [
            { year: 2000, stocks: 1, bonds: 0, cash: 0 },
            { year: 2001, stocks: -0.5, bonds: 0, cash: 0 },
          ],
          annualWithdrawal: 10,
          horizonYears: 2,
        },
        { startingBalance: 100, allocationPreset: 'equity-100' },
      ),
    );

    // start 2000: y1 (100-10)*2 = 180, y2 (180-10)*0.5 = 85
    // start 2001: y1 (100-10)*0.5 = 45, y2 (45-10)*2 = 70
    expect(result.simulationCount).toBe(2);
    expect(result.successRate).toBe(1);
    expect(result.percentileBands[2].p90).toBe(84);
    expect(result.medianEndingBalance).toBe(78); // midpoint of 70 and 85
  });

  it('keeps custom pots on normal draws in historical modes', () => {
    // An absurd history that would explode the balance if it were used
    const historical = runMonteCarloSimulation(
      makeParams(
        {
          returnModel: 'historical-bootstrap',
          historicalReturns: [{ year: 2000, stocks: 9, bonds: 9, cash: 9 }],
        },
        { expectedReturnMean: 0.05, returnStdDev: 0 },
      ),
    );
    const normal = runMonteCarloSimulation(
      makeParams({}, { expectedReturnMean: 0.05, returnStdDev: 0 }),
    );
    expect(historical.percentileBands).toEqual(normal.percentileBands);
  });

  it('guardrails raise withdrawals when the pot races ahead', () => {
    // 4% initial rate with steady 20% growth: the withdrawal rate quickly
    // falls below 80% of the initial rate, triggering prosperity increases
    const base = makeParams(
      { annualWithdrawal: 4_000, horizonYears: 20 },
      { startingBalance: 100_000, expectedReturnMean: 0.2, returnStdDev: 0 },
    );
    const withoutRule = runMonteCarloSimulation(base);
    const withRule = runMonteCarloSimulation({
      ...base,
      withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, type: 'guardrails' },
    });

    expect(withoutRule.medianTotalWithdrawn).toBe(20 * 4_000);
    expect(withRule.medianTotalWithdrawn).toBeGreaterThan(
      withoutRule.medianTotalWithdrawn,
    );
    expect(withRule.successRate).toBe(1);
  });

  it('does not treat a planned phase change as guardrails drift', () => {
    // On-track plan stepping from a 1% to a 2% planned rate at year 11:
    // guardrails measures drift against the planned phase path, so the
    // deliberate jump must not trigger a preservation cut by itself
    const result = runMonteCarloSimulation(
      makeParams(
        {
          horizonYears: 13,
          captureRunDetail: 0,
          withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, type: 'guardrails' },
          spendingPhases: [
            {
              id: 'phase-1',
              name: '',
              fromAge: null,
              annualWithdrawal: 10_000,
            },
            { id: 'phase-2', name: '', fromAge: 70, annualWithdrawal: 20_000 },
          ],
        },
        { startingBalance: 1_000_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.withdrawal)).toEqual([
      ...new Array(10).fill(10_000),
      ...new Array(3).fill(20_000),
    ]);
  });

  it('boundaries cut withdrawals and extend survival', () => {
    // 10% withdrawal rate on a flat pot depletes in exactly year 10
    const base = makeParams(
      { annualWithdrawal: 10_000, horizonYears: 30 },
      { startingBalance: 100_000, expectedReturnMean: 0, returnStdDev: 0 },
    );
    const withoutRule = runMonteCarloSimulation(base);
    expect(withoutRule.medianDepletionYear).toBe(10);

    const withRule = runMonteCarloSimulation({
      ...base,
      withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, type: 'boundaries' },
    });
    expect(withRule.medianDepletionYear ?? Infinity).toBeGreaterThan(10);
    // The extra years come at the cost of income
    expect(withRule.medianTotalWithdrawn).toBeLessThanOrEqual(100_000);
  });

  it('floor-ceiling scales withdrawals with the pot within limits', () => {
    const base = makeParams(
      { annualWithdrawal: 10_000, horizonYears: 30 },
      { startingBalance: 100_000, expectedReturnMean: 0, returnStdDev: 0 },
    );
    const withRule = runMonteCarloSimulation({
      ...base,
      withdrawalRule: {
        ...WITHDRAWAL_RULE_DEFAULTS,
        type: 'floor-ceiling',
        floorPct: 0.5,
        ceilingPct: 0.5,
      },
    });

    // Withdrawing ~10% of a shrinking pot (floored at 5,000/year) lasts far
    // longer than a fixed 10,000/year, which dies in year 10
    expect(withRule.medianDepletionYear ?? Infinity).toBeGreaterThan(14);
  });

  it('ratcheting increases withdrawals after consecutive years above the threshold', () => {
    const base = makeParams(
      { annualWithdrawal: 1_000, horizonYears: 20 },
      { startingBalance: 100_000, expectedReturnMean: 0.3, returnStdDev: 0 },
    );
    const withoutRule = runMonteCarloSimulation(base);
    const withRule = runMonteCarloSimulation({
      ...base,
      withdrawalRule: {
        ...WITHDRAWAL_RULE_DEFAULTS,
        type: 'ratcheting',
        balanceThresholdMultiple: 1.5,
        consecutiveYears: 3,
        ratchetIncreasePct: 0.5,
      },
    });

    expect(withoutRule.medianTotalWithdrawn).toBe(20 * 1_000);
    expect(withRule.medianTotalWithdrawn).toBeGreaterThan(
      withoutRule.medianTotalWithdrawn,
    );
  });

  it('minimum withdrawal floor neutralizes rule cuts', () => {
    const base = makeParams(
      { annualWithdrawal: 10_000, horizonYears: 30 },
      { startingBalance: 100_000, expectedReturnMean: 0, returnStdDev: 0 },
    );
    const withoutRule = runMonteCarloSimulation(base);
    const cutsFloored = runMonteCarloSimulation({
      ...base,
      withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, type: 'boundaries' },
      minimumWithdrawal: 10_000,
    });

    expect(cutsFloored.percentileBands).toEqual(withoutRule.percentileBands);
    expect(cutsFloored.medianTotalWithdrawn).toBe(
      withoutRule.medianTotalWithdrawn,
    );
  });

  it('takes nothing in zero-spend phases even with a minimum withdrawal', () => {
    // Working years first (costs covered by salary), retirement at 65;
    // the floor guards against rule-driven cuts and must not invent
    // withdrawals during a deliberate zero-spend phase
    // The horizon stops before spend-down drift would cross the
    // preservation trigger, so retirement withdrawals stay at the
    // planned amount and the assertions are exact
    const result = runMonteCarloSimulation(
      makeParams(
        {
          horizonYears: 8,
          captureRunDetail: 0,
          minimumWithdrawal: 15_000,
          withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, type: 'guardrails' },
          spendingPhases: [
            { id: 'working', name: '', fromAge: null, annualWithdrawal: 0 },
            { id: 'retired', name: '', fromAge: 65, annualWithdrawal: 40_000 },
          ],
        },
        { startingBalance: 500_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    const rows = result.runDetail!;
    // currentAge is 60, so years 1-5 (ages 60-64) are the zero phase
    for (const row of rows.slice(0, 5)) {
      expect(row.withdrawal).toBe(0);
    }
    // From 65 the planned spending applies, already above the floor
    for (const row of rows.slice(5)) {
      expect(row.withdrawal).toBe(40_000);
    }
  });

  it("keeps the minimum withdrawal floor in today's money under inflation", () => {
    // Guardrails cut hard while prices rise; the floor must rise with
    // inflation too, so in today's money withdrawals never dip below it
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 10_000,
          horizonYears: 8,
          inflationMean: 0.05,
          inflationStdDev: 0,
          deflateToTodaysMoney: true,
          captureRunDetail: 0,
          minimumWithdrawal: 8_000,
          withdrawalRule: {
            ...WITHDRAWAL_RULE_DEFAULTS,
            type: 'guardrails',
            preservationTriggerPct: 0.1,
            preservationCutPct: 0.5,
          },
        },
        { startingBalance: 100_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    const rows = result.runDetail!;
    expect(rows).toHaveLength(8);
    expect(rows[0].withdrawal).toBe(10_000);
    // Year 2's 50% cut lands well below the floor, so the floor binds
    expect(rows[1].withdrawal).toBe(8_000);
    for (const row of rows.slice(1)) {
      expect(row.withdrawal).toBeGreaterThanOrEqual(8_000);
    }
  });

  it('fails when accessible pots run dry before a locked pot unlocks', () => {
    // Current age 60; the big pot only unlocks at 120, far past the horizon.
    // The accessible pot funds 30/year from 100: y1 70, y2 40, y3 10, then
    // year 4 can't be covered - the locked money doesn't save the plan.
    const result = runMonteCarloSimulation(
      makeParams({
        pots: [
          makePot({
            id: 'isa',
            startingBalance: 100,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'pension',
            startingBalance: 1_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            accessAge: 120,
          }),
        ],
        annualWithdrawal: 30,
        horizonYears: 20,
      }),
    );

    expect(result.successRate).toBe(0);
    expect(result.medianDepletionYear).toBe(4);
  });

  it('survives when the locked pot unlocks in time', () => {
    // Same setup, but the pension unlocks at 63 - exactly year 4, just as
    // the accessible pot runs out
    const result = runMonteCarloSimulation(
      makeParams({
        pots: [
          makePot({
            id: 'isa',
            startingBalance: 100,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'pension',
            startingBalance: 1_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            accessAge: 63,
          }),
        ],
        annualWithdrawal: 30,
        horizonYears: 20,
      }),
    );

    expect(result.successRate).toBe(1);
  });

  it('treats an access age at or below the current age as immediate', () => {
    const immediate = runMonteCarloSimulation(
      makeParams({}, { accessAge: null }),
    );
    const alreadyReached = runMonteCarloSimulation(
      makeParams({}, { accessAge: 40 }),
    );
    expect(alreadyReached).toEqual(immediate);
  });

  it('sequential order skips locked pots until they unlock', () => {
    // The first-listed pot is locked past the horizon, so sequential
    // withdrawals drain the second pot: 100 at 10/year fails in year 10
    const result = runMonteCarloSimulation(
      makeParams({
        withdrawalStrategy: 'sequential',
        pots: [
          makePot({
            id: 'locked-first',
            startingBalance: 1_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            accessAge: 120,
          }),
          makePot({
            id: 'open-second',
            startingBalance: 100,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
        ],
        annualWithdrawal: 10,
        horizonYears: 20,
      }),
    );

    expect(result.medianDepletionYear).toBe(10);
  });

  it('best-performer order drains the pot with the highest return last year', () => {
    // Pot A (0% return) is listed first, pot B earns 50% every year.
    // Year 1 has no returns yet, so the listed order drains A; from year
    // 2 onward B is always last year's best performer and gets drained.
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 10,
        horizonYears: 4,
        withdrawalStrategy: 'best-performer',
        captureRunDetail: 0,
        pots: [
          makePot({
            id: 'a',
            startingBalance: 100,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'b',
            startingBalance: 100,
            expectedReturnMean: 0.5,
            returnStdDev: 0,
          }),
        ],
      }),
    );

    // Hand recurrence: y1 drains A then B grows 50%; y2-y4 drain B only
    expect(result.runDetail!.map(row => row.potBalances)).toEqual([
      [90, 150],
      [90, 210],
      [90, 300],
      [90, 435],
    ]);
    expect(result.runDetail!.map(row => row.potWithdrawals)).toEqual([
      [10, 0],
      [0, 10],
      [0, 10],
      [0, 10],
    ]);
  });

  it('best-performer order switches pots as the market flips', () => {
    // Alternating real years: stocks crash, boom, crash, boom while cash
    // stays flat. After a crash the cash pot funds the withdrawal (stocks
    // left to recover); after a boom the stocks pot funds it.
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 100,
        horizonYears: 4,
        withdrawalStrategy: 'best-performer',
        returnModel: 'historical-sequence',
        captureRunDetail: 0,
        historicalReturns: [
          { year: 2001, stocks: -0.5, bonds: 0, cash: 0 },
          { year: 2002, stocks: 1, bonds: 0, cash: 0 },
          { year: 2003, stocks: -0.5, bonds: 0, cash: 0 },
          { year: 2004, stocks: 1, bonds: 0, cash: 0 },
        ],
        pots: [
          makePot({
            id: 'stocks',
            startingBalance: 1_000,
            allocationPreset: 'equity-100',
          }),
          makePot({
            id: 'cash',
            startingBalance: 1_000,
            allocationPreset: 'cash',
          }),
        ],
      }),
    );

    // y1: listed order drains stocks, then the crash halves them;
    // y2: cash beat stocks last year -> drain cash, stocks double back;
    // y3: stocks boomed last year -> drain stocks, then they halve;
    // y4: cash beat stocks again -> drain cash, stocks double back
    expect(result.runDetail!.map(row => row.potBalances)).toEqual([
      [450, 1_000],
      [900, 900],
      [400, 900],
      [800, 800],
    ]);
  });

  it('best-performer order falls back to the listed order on ties', () => {
    // Identical pots share every market shock, so their returns always
    // tie and best-performer must behave exactly like draining in order
    const pots = [
      makePot({ id: 'a', startingBalance: 25_000_000 }),
      makePot({ id: 'b', startingBalance: 25_000_000 }),
    ];
    const sequential = runMonteCarloSimulation(
      makeParams({ withdrawalStrategy: 'sequential', pots }),
    );
    const bestPerformer = runMonteCarloSimulation(
      makeParams({ withdrawalStrategy: 'best-performer', pots }),
    );

    expect(bestPerformer.successRate).toBe(sequential.successRate);
    expect(bestPerformer.percentileBands).toEqual(sequential.percentileBands);
    expect(bestPerformer.medianTotalWithdrawn).toBe(
      sequential.medianTotalWithdrawn,
    );
  });

  it('target-mix order withdraws from overweight pots back toward the mix', () => {
    // 50/50 starting mix; pot B doubles every year while A is flat, so B
    // is always the overweight pot and funds every withdrawal after year 1
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 30,
        horizonYears: 3,
        withdrawalStrategy: 'target-mix',
        captureRunDetail: 0,
        pots: [
          makePot({
            id: 'a',
            startingBalance: 100,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'b',
            startingBalance: 100,
            expectedReturnMean: 1,
            returnStdDev: 0,
          }),
        ],
      }),
    );

    // y1: both pots sit exactly at target, so each gives up its share
    // (15 each); afterwards only B is ever above its ideal balance
    expect(result.runDetail!.map(row => row.potBalances)).toEqual([
      [85, 170],
      [85, 280],
      [85, 500],
    ]);
    expect(result.runDetail!.map(row => row.potWithdrawals)).toEqual([
      [15, 15],
      [0, 30],
      [0, 30],
    ]);
  });

  it('target-mix order matches proportional when pots never drift', () => {
    // Identical returns keep every pot exactly at its target share, so
    // pulling toward the mix and splitting proportionally take the same
    // amounts from the same pots
    const pots = [
      makePot({ id: 'a', startingBalance: 30_000_000 }),
      makePot({ id: 'b', startingBalance: 20_000_000 }),
    ];
    const proportional = runMonteCarloSimulation(
      makeParams({ withdrawalStrategy: 'proportional', pots }),
    );
    const targetMix = runMonteCarloSimulation(
      makeParams({ withdrawalStrategy: 'target-mix', pots }),
    );

    expect(targetMix.successRate).toBe(proportional.successRate);
    expect(
      Math.abs(
        targetMix.medianEndingBalance - proportional.medianEndingBalance,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        targetMix.medianTotalWithdrawn - proportional.medianTotalWithdrawn,
      ),
    ).toBeLessThanOrEqual(1);
  });

  it('guardrails ignore a booming locked pot during a bridge', () => {
    // Accessible bridge pot drains while a locked pension quintuples: the
    // rule must measure the withdrawal rate against accessible wealth and
    // CUT spending, not hand out prosperity raises against locked money
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 10_000,
        horizonYears: 5,
        captureRunDetail: 0,
        withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, type: 'guardrails' },
        pots: [
          makePot({
            id: 'bridge',
            startingBalance: 100_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'pension',
            startingBalance: 1_000_000,
            expectedReturnMean: 0.2,
            returnStdDev: 0,
            accessAge: 120,
          }),
        ],
      }),
    );

    // Reference rate is 10% of the accessible start; the draining bridge
    // pot pushes the rate past the guardrail and spending steps down
    expect(result.runDetail!.map(row => row.withdrawal)).toEqual([
      10_000, 10_000, 9_000, 8_100, 7_290,
    ]);
  });

  it('ratcheting ignores a booming locked pot during a bridge', () => {
    // Pre-fix, total wealth (locked pension included) crossing the
    // threshold ratcheted spending up while only the bridge pot could pay
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 10_000,
        horizonYears: 5,
        captureRunDetail: 0,
        withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, type: 'ratcheting' },
        pots: [
          makePot({
            id: 'bridge',
            startingBalance: 100_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'pension',
            startingBalance: 1_000_000,
            expectedReturnMean: 0.5,
            returnStdDev: 0,
            accessAge: 120,
          }),
        ],
      }),
    );

    expect(result.runDetail!.map(row => row.withdrawal)).toEqual([
      10_000, 10_000, 10_000, 10_000, 10_000,
    ]);
  });

  it('reports per-run summaries consistent with the aggregates', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 2_500_000 },
        { startingBalance: 30_000_000, returnStdDev: 0.15 },
      ),
    );

    expect(result.endingBalances).toHaveLength(result.simulationCount);
    expect(result.depletionYearBySimulation).toHaveLength(
      result.simulationCount,
    );
    expect(result.totalWithdrawnBySimulation).toHaveLength(
      result.simulationCount,
    );

    let survived = 0;
    for (
      let simulationIndex = 0;
      simulationIndex < result.simulationCount;
      simulationIndex++
    ) {
      if (result.depletionYearBySimulation[simulationIndex] === -1) {
        survived++;
      } else {
        // Depleted runs end at zero
        expect(result.endingBalances[simulationIndex]).toBe(0);
      }
    }
    expect(survived / result.simulationCount).toBe(result.successRate);
  });

  it('captures a run year by year matching the closed-form recurrence', () => {
    const params = makeParams(
      { annualWithdrawal: 10_000, horizonYears: 30, captureRunDetail: 0 },
      {
        startingBalance: 100_000,
        expectedReturnMean: 0.05,
        returnStdDev: 0,
      },
    );
    const result = runMonteCarloSimulation(params);
    const rows = result.runDetail;
    expect(rows).toBeDefined();

    // Replicate the recurrence independently
    let balance = 100_000;
    for (const row of rows!) {
      expect(row.startBalance).toBe(Math.round(balance));
      if (balance <= 10_000) {
        // Depletion year: only the remainder could be withdrawn
        expect(row.withdrawal).toBe(Math.round(balance));
        expect(row.endBalance).toBe(0);
        break;
      }
      expect(row.withdrawal).toBe(10_000);
      const afterWithdrawal = balance - 10_000;
      balance = afterWithdrawal * 1.05;
      expect(row.endBalance).toBe(Math.round(balance));
      expect(row.growth).toBe(Math.round(balance - afterWithdrawal));
    }

    // Rows stop at the depletion year
    const lastRow = rows![rows!.length - 1];
    expect(lastRow.year).toBe(result.medianDepletionYear);
    expect(lastRow.endBalance).toBe(0);
  });

  it('replays a volatile run identically to the original', () => {
    const base = makeParams({}, { returnStdDev: 0.15 });
    const original = runMonteCarloSimulation(base);

    const simulationIndex = 123;
    const replay = runMonteCarloSimulation({
      ...base,
      captureRunDetail: simulationIndex,
    });
    const rows = replay.runDetail!;

    const depletionYear = original.depletionYearBySimulation[simulationIndex];
    if (depletionYear === -1) {
      expect(rows).toHaveLength(original.horizonYears);
      expect(rows[rows.length - 1].endBalance).toBe(
        Math.round(original.endingBalances[simulationIndex]),
      );
    } else {
      expect(rows).toHaveLength(depletionYear);
      expect(rows[rows.length - 1].endBalance).toBe(0);
    }
  });

  it('marks locked money on a captured bridge-gap failure row', () => {
    const result = runMonteCarloSimulation(
      makeParams({
        pots: [
          makePot({
            id: 'isa',
            startingBalance: 100,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'pension',
            startingBalance: 1_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            accessAge: 120,
          }),
        ],
        annualWithdrawal: 30,
        horizonYears: 20,
        captureRunDetail: 0,
      }),
    );

    const rows = result.runDetail!;
    const failureRow = rows[rows.length - 1];
    // y1 70, y2 40, y3 10 accessible; year 4 fails with 10 reachable
    expect(failureRow.year).toBe(4);
    expect(failureRow.withdrawal).toBe(10);
    // The locked pension is not an investment loss
    expect(failureRow.growth).toBe(0);
    expect(failureRow.endBalance).toBe(0);
    expect(failureRow.inaccessibleBalance).toBe(1_000);
    // Per-pot view: the ISA was consumed, the pension stayed locked
    expect(failureRow.potBalances).toEqual([0, 1_000]);
    expect(rows[0].potBalances).toEqual([70, 1_000]);
    // The shortfall year took the ISA's last 10; the locked pension
    // funded nothing in any year
    expect(rows[0].potWithdrawals).toEqual([30, 0]);
    expect(failureRow.potWithdrawals).toEqual([10, 0]);
    // Zero-volatility pots return exactly 0% each year; on the failure year
    // no returns are applied at all
    expect(rows[0].potReturns).toEqual([0, 0]);
    expect(failureRow.potReturns).toEqual([null, null]);
  });

  it('switches spending phases at their starting age', () => {
    // 30/year for the first 10 years (ages 60-69), 20/year onwards
    const result = runMonteCarloSimulation(
      makeParams(
        {
          spendingPhases: [
            { id: 'a', name: '', fromAge: null, annualWithdrawal: 30 },
            { id: 'b', name: '', fromAge: 70, annualWithdrawal: 20 },
          ],
          horizonYears: 20,
        },
        { startingBalance: 1_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.successRate).toBe(1);
    expect(result.medianTotalWithdrawn).toBe(30 * 10 + 20 * 10);
  });

  it('applies inflation from the simulation start across phase switches', () => {
    // 100% inflation; phase 2 starts in year 3 (age 62):
    // y1: 10x1 = 10; y2: 10x2 = 20; y3: 20x4 = 80
    const result = runMonteCarloSimulation(
      makeParams(
        {
          spendingPhases: [
            { id: 'a', name: '', fromAge: null, annualWithdrawal: 10 },
            { id: 'b', name: '', fromAge: 62, annualWithdrawal: 20 },
          ],
          inflationMean: 1,
          horizonYears: 3,
          captureRunDetail: 0,
        },
        { startingBalance: 1_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.runDetail!.map(row => row.withdrawal)).toEqual([10, 20, 80]);
    expect(result.medianTotalWithdrawn).toBe(110);
  });

  it('keeps rule adjustments across phase boundaries', () => {
    // Boundaries rule cuts 10% in year 2 (rate 1000/9000 > 10%); the cut
    // factor must still discount the smaller phase-2 amount in year 3
    const result = runMonteCarloSimulation(
      makeParams(
        {
          spendingPhases: [
            { id: 'a', name: '', fromAge: null, annualWithdrawal: 1_000 },
            { id: 'b', name: '', fromAge: 62, annualWithdrawal: 500 },
          ],
          withdrawalRule: {
            ...WITHDRAWAL_RULE_DEFAULTS,
            type: 'boundaries',
            upperRateThreshold: 0.1,
            upperCutPct: 0.1,
            lowerRateThreshold: 0,
            lowerIncreasePct: 0,
          },
          horizonYears: 3,
          captureRunDetail: 0,
        },
        { startingBalance: 10_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.runDetail!.map(row => row.withdrawal)).toEqual([
      1_000,
      900, // 10% cut
      450, // phase-2 amount 500 x the persisted 0.9 factor
    ]);
  });

  it('ignores the minimum withdrawal floor when no rule is active', () => {
    // A leftover floor higher than the planned spending must not raise
    // withdrawals once the rule is switched back to None
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 10_000,
          minimumWithdrawal: 20_000,
          horizonYears: 10,
        },
        { startingBalance: 500_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.medianTotalWithdrawn).toBe(10 * 10_000);
  });

  it("shows flat real withdrawals when deflating to today's money", () => {
    // Nominal withdrawals grow with inflation; in today's money the planned
    // spending reads as a constant amount and the total is years x amount
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 10_000,
          inflationMean: 0.1,
          horizonYears: 5,
          deflateToTodaysMoney: true,
          captureRunDetail: 0,
        },
        { startingBalance: 1_000_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.runDetail!.map(row => row.withdrawal)).toEqual([
      10_000, 10_000, 10_000, 10_000, 10_000,
    ]);
    expect(result.medianTotalWithdrawn).toBe(5 * 10_000);
  });

  it('deflated results match an equivalent real-return simulation', () => {
    // Deflating a nominal simulation must equal simulating directly with
    // the real return: (1 + nominal) / (1 + inflation) - 1
    const deflated = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 10_000,
          inflationMean: 1,
          horizonYears: 10,
          deflateToTodaysMoney: true,
        },
        {
          startingBalance: 200_000,
          expectedReturnMean: 1.1, // 110% nominal
          returnStdDev: 0,
        },
      ),
    );
    const real = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 10_000, inflationMean: null, horizonYears: 10 },
        {
          startingBalance: 200_000,
          expectedReturnMean: 2.1 / 2 - 1, // 5% real
          returnStdDev: 0,
        },
      ),
    );

    for (let year = 0; year <= 10; year++) {
      expect(
        Math.abs(
          deflated.percentileBands[year].p50 - real.percentileBands[year].p50,
        ),
      ).toBeLessThanOrEqual(1);
    }
    expect(
      Math.abs(deflated.medianEndingBalance - real.medianEndingBalance),
    ).toBeLessThanOrEqual(1);
  });

  it('is deterministic with inflation volatility and differs from a fixed rate', () => {
    const volatileParams = makeParams(
      { inflationMean: 0.025, inflationStdDev: 0.04 },
      { returnStdDev: 0.15 },
    );
    const firstRun = runMonteCarloSimulation(volatileParams);
    const secondRun = runMonteCarloSimulation(volatileParams);
    expect(firstRun).toEqual(secondRun);

    const fixed = runMonteCarloSimulation(
      makeParams(
        { inflationMean: 0.025, inflationStdDev: 0 },
        { returnStdDev: 0.15 },
      ),
    );
    expect(firstRun.successRate).not.toBe(fixed.successRate);

    // Percentile ordering holds under inflation volatility too
    for (const band of firstRun.percentileBands) {
      expect(band.p10).toBeLessThanOrEqual(band.p50);
      expect(band.p50).toBeLessThanOrEqual(band.p90);
    }
  });

  it('shows flat real withdrawals even under volatile inflation', () => {
    // However wild the drawn inflation path, deflating by that same path
    // must bring the planned spending back to its flat today's-money amount
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 10_000,
          inflationMean: 0.1,
          inflationStdDev: 0.5,
          horizonYears: 5,
          deflateToTodaysMoney: true,
          captureRunDetail: 3,
        },
        {
          startingBalance: 100_000_000,
          expectedReturnMean: 0,
          returnStdDev: 0,
        },
      ),
    );

    expect(result.runDetail!.map(row => row.withdrawal)).toEqual([
      10_000, 10_000, 10_000, 10_000, 10_000,
    ]);
  });

  it('clamps out-of-range inputs', () => {
    const result = runMonteCarloSimulation(
      makeParams({ simulationCount: 50, horizonYears: 500 }),
    );
    expect(result.simulationCount).toBe(MIN_SIMULATION_COUNT);
    expect(result.horizonYears).toBe(MAX_HORIZON_YEARS);
  });

  it('flat tax grosses up withdrawals to deliver the net spending', () => {
    // 20% tax pot: delivering 8,000 net costs 10,000 gross each year, so
    // 95,000 funds nine full years and fails in year ten with the last
    // 5,000 delivering only 4,000 net
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 8_000, horizonYears: 12, captureRunDetail: 0 },
        {
          startingBalance: 95_000,
          expectedReturnMean: 0,
          returnStdDev: 0,
          withdrawalTaxRate: 0.2,
        },
      ),
    );

    expect(result.successRate).toBe(0);
    expect(result.medianDepletionYear).toBe(10);
    const rows = result.runDetail!;
    expect(rows).toHaveLength(10);
    for (const row of rows.slice(0, 9)) {
      expect(row.withdrawal).toBe(10_000);
      expect(row.taxPaid).toBe(2_000);
    }
    expect(rows[9].withdrawal).toBe(5_000);
    expect(rows[9].taxPaid).toBe(1_000);
    expect(rows[9].endBalance).toBe(0);
  });

  it('flat tax applies per pot as sequential order crosses pots', () => {
    // Tax-free ISA pays the first three years at face value; once it runs
    // dry the 25%-taxed pension must gross up to 13,333 for the same
    // 10,000 of spending
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 10_000,
        horizonYears: 5,
        withdrawalStrategy: 'sequential',
        captureRunDetail: 0,
        pots: [
          makePot({
            id: 'isa',
            startingBalance: 30_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'pension',
            startingBalance: 100_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            withdrawalTaxRate: 0.25,
          }),
        ],
      }),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.withdrawal)).toEqual([
      10_000, 10_000, 10_000, 13_333, 13_333,
    ]);
    expect(rows.map(row => row.taxPaid)).toEqual([0, 0, 0, 3_333, 3_333]);
    expect(rows[3].potWithdrawals).toEqual([0, 13_333]);
    // Flat-model tax attributes exactly to the pot that paid it; the
    // taxable amount is the whole take for a pot with a nonzero rate
    expect(rows[0].potTaxes).toEqual([0, 0]);
    expect(rows[3].potTaxes).toEqual([0, 3_333]);
    expect(rows[0].potTaxables).toEqual([0, 0]);
    expect(rows[3].potTaxables).toEqual([0, 13_333]);
  });

  it('tax bands gross up progressively over the taxable income', () => {
    // Bands: first 10,000 tax-free, 20% above. Delivering 18,000 net
    // needs 20,000 gross (tax 2,000 on the 10,000 above the threshold)
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 18_000,
          horizonYears: 3,
          captureRunDetail: 0,
          taxModel: 'bands',
          taxBands: [
            { id: 'a', from: 0, rate: 0 },
            { id: 'b', from: 10_000, rate: 0.2 },
          ],
        },
        { startingBalance: 200_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.withdrawal)).toEqual([20_000, 20_000, 20_000]);
    expect(rows.map(row => row.taxPaid)).toEqual([2_000, 2_000, 2_000]);
  });

  it('tax bands pool taxable income across pots by taxable fraction', () => {
    // Proportional split takes half the gross from each pot; only the
    // pension half is 75% taxable, so taxable income is 0.375x the gross.
    // Solving 0.925g = 38,000 gives g = 41,081 for 40,000 net
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 40_000,
        horizonYears: 1,
        captureRunDetail: 0,
        taxModel: 'bands',
        taxBands: [
          { id: 'a', from: 0, rate: 0 },
          { id: 'b', from: 10_000, rate: 0.2 },
        ],
        pots: [
          makePot({
            id: 'isa',
            startingBalance: 100_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            taxableFraction: 0,
          }),
          makePot({
            id: 'pension',
            startingBalance: 100_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            taxableFraction: 0.75,
          }),
        ],
      }),
    );

    const row = result.runDetail![0];
    expect(row.withdrawal).toBe(41_081);
    expect(row.taxPaid).toBe(1_081);
    // Raw takes are 20,540.5 each; the parts reconcile to the 41,081
    // total (equal remainders break toward the earlier pot) instead of
    // both rounding up to a sum of 41,082
    expect(row.potWithdrawals).toEqual([20_541, 20_540]);
    // Bands-model tax prorates by taxable share: the tax-free pot
    // contributes no taxable income, so the pension carries all the tax
    expect(row.potTaxes).toEqual([0, 1_081]);
    // Taxable amounts: take x taxable fraction (20,540.54 x 0.75)
    expect(row.potTaxables).toEqual([0, 15_405]);
  });

  it("tax band thresholds are in today's money and rise with inflation", () => {
    // With 5% fixed inflation the nominal gross grows every year, but in
    // today's money the withdrawal and tax stay exactly 20,000 and 2,000
    // because the thresholds inflate along with spending
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 18_000,
          horizonYears: 4,
          inflationMean: 0.05,
          inflationStdDev: 0,
          deflateToTodaysMoney: true,
          captureRunDetail: 0,
          taxModel: 'bands',
          taxBands: [
            { id: 'a', from: 0, rate: 0 },
            { id: 'b', from: 10_000, rate: 0.2 },
          ],
        },
        { startingBalance: 500_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.withdrawal)).toEqual([
      20_000, 20_000, 20_000, 20_000,
    ]);
    expect(rows.map(row => row.taxPaid)).toEqual([2_000, 2_000, 2_000, 2_000]);
  });

  it('a single tax band behaves like the same flat rate', () => {
    const flat = runMonteCarloSimulation(
      makeParams({}, { withdrawalTaxRate: 0.25 }),
    );
    const bands = runMonteCarloSimulation(
      makeParams(
        {
          taxModel: 'bands',
          taxBands: [{ id: 'a', from: 0, rate: 0.25 }],
        },
        { taxableFraction: 1 },
      ),
    );

    expect(bands.successRate).toBe(flat.successRate);
    expect(
      Math.abs(bands.medianEndingBalance - flat.medianEndingBalance),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(bands.medianTotalWithdrawn - flat.medianTotalWithdrawn),
    ).toBeLessThanOrEqual(1);
  });

  it('zero-rate tax configurations match the untaxed engine exactly', () => {
    const untaxed = runMonteCarloSimulation(makeParams());
    const zeroBands = runMonteCarloSimulation(
      makeParams({
        taxModel: 'bands',
        taxBands: [{ id: 'a', from: 0, rate: 0 }],
      }),
    );

    expect(zeroBands.percentileBands).toEqual(untaxed.percentileBands);
    expect(zeroBands.successRate).toBe(untaxed.successRate);
  });

  it('deducts a fixed yearly fee at the end of each year', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 0, horizonYears: 3, captureRunDetail: 0 },
        {
          startingBalance: 100_000,
          expectedReturnMean: 0,
          returnStdDev: 0,
          annualFeeFixed: 1_000,
        },
      ),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.endBalance)).toEqual([99_000, 98_000, 97_000]);
    expect(rows.map(row => row.feesPaid)).toEqual([1_000, 1_000, 1_000]);
    // Growth stays pure market performance (zero here) - fees are separate
    expect(rows.map(row => row.growth)).toEqual([0, 0, 0]);
  });

  it('deducts a percentage fee from the end-of-year balance', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 0, horizonYears: 3, captureRunDetail: 0 },
        {
          startingBalance: 100_000,
          expectedReturnMean: 0,
          returnStdDev: 0,
          annualFeeRate: 0.01,
        },
      ),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.endBalance)).toEqual([99_000, 98_010, 97_030]);
    expect(rows.map(row => row.feesPaid)).toEqual([1_000, 990, 980]);
  });

  it("captures each pot's own fee in the run detail", () => {
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 0,
        horizonYears: 2,
        captureRunDetail: 0,
        pots: [
          makePot({
            id: 'fixed-fee',
            startingBalance: 100_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            annualFeeFixed: 1_000,
          }),
          makePot({
            id: 'rate-fee',
            startingBalance: 200_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            annualFeeRate: 0.01,
          }),
          makePot({
            id: 'no-fee',
            startingBalance: 50_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
        ],
      }),
    );

    const rows = result.runDetail!;
    // Year 1: 1,000 fixed; 1% of 200,000; nothing from the fee-free pot
    expect(rows[0].potFees).toEqual([1_000, 2_000, 0]);
    // Year 2: the percentage pot's balance shrank to 198,000
    expect(rows[1].potFees).toEqual([1_000, 1_980, 0]);
    // Each year opens with the previous year's post-fee balances
    expect(rows[0].potStartBalances).toEqual([100_000, 200_000, 50_000]);
    expect(rows[1].potStartBalances).toEqual([99_000, 198_000, 50_000]);
    for (const row of rows) {
      expect(row.potFees.reduce((sum, fee) => sum + fee, 0)).toBe(row.feesPaid);
      expect(
        row.potStartBalances.reduce((sum, balance) => sum + balance, 0),
      ).toBe(row.startBalance);
      expect(row.potBalances.reduce((sum, balance) => sum + balance, 0)).toBe(
        row.endBalance,
      );
    }
  });

  it('rounds per-pot amounts so they sum exactly to the row totals', () => {
    // Each pot's raw fee is 10.5: rounded independently both would show
    // 11, summing to 22 against a fees-paid total of 21. The largest-
    // remainder split keeps the parts reconciled with the total instead.
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 0,
        horizonYears: 1,
        captureRunDetail: 0,
        pots: [
          makePot({
            id: 'pot-a',
            startingBalance: 1_050,
            expectedReturnMean: 0,
            returnStdDev: 0,
            annualFeeRate: 0.01,
          }),
          makePot({
            id: 'pot-b',
            startingBalance: 1_050,
            expectedReturnMean: 0,
            returnStdDev: 0,
            annualFeeRate: 0.01,
          }),
        ],
      }),
    );

    const row = result.runDetail![0];
    expect(row.feesPaid).toBe(21);
    // Equal remainders break ties toward the earlier pot
    expect(row.potFees).toEqual([11, 10]);
  });

  it("keeps an inflation-adjusted fixed fee constant in today's money", () => {
    const base = {
      annualWithdrawal: 0,
      horizonYears: 3,
      inflationMean: 0.05,
      inflationStdDev: 0,
      deflateToTodaysMoney: true,
      captureRunDetail: 0,
    };
    const adjusted = runMonteCarloSimulation(
      makeParams(base, {
        startingBalance: 100_000,
        expectedReturnMean: 0,
        returnStdDev: 0,
        annualFeeFixed: 1_000,
        feeAdjustsWithInflation: true,
      }),
    );
    expect(adjusted.runDetail!.map(row => row.feesPaid)).toEqual([
      1_000, 1_000, 1_000,
    ]);

    // A non-adjusted fee shrinks in real terms as prices rise
    const flat = runMonteCarloSimulation(
      makeParams(base, {
        startingBalance: 100_000,
        expectedReturnMean: 0,
        returnStdDev: 0,
        annualFeeFixed: 1_000,
      }),
    );
    const flatFees = flat.runDetail!.map(row => row.feesPaid);
    expect(flatFees[0]).toBeLessThan(1_000);
    expect(flatFees[2]).toBeLessThan(flatFees[0]);
  });

  it('adds contributions at the start of each year', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 0,
          horizonYears: 3,
          captureRunDetail: 0,
          contributions: [makeContribution({ annualAmount: 10_000 })],
        },
        { startingBalance: 100_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.startBalance)).toEqual([
      100_000, 110_000, 120_000,
    ]);
    expect(rows.map(row => row.contributions)).toEqual([
      10_000, 10_000, 10_000,
    ]);
    expect(rows.map(row => row.endBalance)).toEqual([
      110_000, 120_000, 130_000,
    ]);
  });

  it("an inflation-adjusted contribution stays constant in today's money", () => {
    const base = {
      annualWithdrawal: 0,
      horizonYears: 3,
      inflationMean: 0.05,
      inflationStdDev: 0,
      deflateToTodaysMoney: true,
      captureRunDetail: 0,
    };
    const potSettings = {
      startingBalance: 100_000,
      expectedReturnMean: 0,
      returnStdDev: 0,
    };
    const adjusted = runMonteCarloSimulation(
      makeParams(
        {
          ...base,
          contributions: [
            makeContribution({
              annualAmount: 10_000,
              adjustsWithInflation: true,
            }),
          ],
        },
        potSettings,
      ),
    );
    expect(adjusted.runDetail!.map(row => row.contributions)).toEqual([
      10_000, 10_000, 10_000,
    ]);

    // A flat contribution buys less each year as prices rise
    const flat = runMonteCarloSimulation(
      makeParams(
        {
          ...base,
          contributions: [makeContribution({ annualAmount: 10_000 })],
        },
        potSettings,
      ),
    );
    const flatContributions = flat.runDetail!.map(row => row.contributions);
    expect(flatContributions[0]).toBe(10_000);
    expect(flatContributions[1]).toBeLessThan(10_000);
    expect(flatContributions[2]).toBeLessThan(flatContributions[1]);
  });

  it('respects the contribution age window, inclusive on both ends', () => {
    // currentAge is 60, so years 3-4 are ages 62-63
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 0,
          horizonYears: 5,
          captureRunDetail: 0,
          contributions: [
            makeContribution({ annualAmount: 10_000, fromAge: 62, toAge: 63 }),
          ],
        },
        { startingBalance: 100_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.runDetail!.map(row => row.contributions)).toEqual([
      0, 0, 10_000, 10_000, 0,
    ]);
  });

  it('deposits into locked pots - access age only gates withdrawals', () => {
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 0,
        horizonYears: 2,
        captureRunDetail: 0,
        contributions: [
          makeContribution({ potId: 'locked-pot', annualAmount: 10_000 }),
        ],
        pots: [
          makePot({
            id: 'open-pot',
            startingBalance: 50_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'locked-pot',
            startingBalance: 20_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
            accessAge: 100,
          }),
        ],
      }),
    );

    const rows = result.runDetail!;
    expect(rows[0].potContributions).toEqual([0, 10_000]);
    expect(rows[1].potBalances).toEqual([50_000, 40_000]);
  });

  it('ignores reversed and beyond-horizon contribution windows', () => {
    // currentAge 60 with a 5-year horizon simulates ages 60-64. A
    // reversed window can never match an age, and a window starting at
    // the final age (65) is past the last simulated year - both must
    // contribute nothing rather than misbehave.
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 0,
          horizonYears: 5,
          captureRunDetail: 0,
          contributions: [
            makeContribution({
              id: 'reversed',
              annualAmount: 10_000,
              fromAge: 63,
              toAge: 61,
            }),
            makeContribution({
              id: 'too-late',
              annualAmount: 10_000,
              fromAge: 65,
            }),
          ],
        },
        { startingBalance: 50_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    for (const row of result.runDetail!) {
      expect(row.contributions).toBe(0);
    }
    expect(result.runDetail![4].endBalance).toBe(50_000);
  });

  it('emits one pot contribution entry per pot even without contributions', () => {
    // A contribution into a pot that no longer exists is ignored, but the
    // captured rows must still carry a per-pot array in pot order, like
    // every other per-pot field
    const result = runMonteCarloSimulation(
      makeParams({
        annualWithdrawal: 0,
        horizonYears: 2,
        captureRunDetail: 0,
        contributions: [
          makeContribution({ potId: 'deleted-pot', annualAmount: 10_000 }),
        ],
        pots: [
          makePot({
            id: 'pot-a',
            startingBalance: 50_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
          makePot({
            id: 'pot-b',
            startingBalance: 20_000,
            expectedReturnMean: 0,
            returnStdDev: 0,
          }),
        ],
      }),
    );

    for (const row of result.runDetail!) {
      expect(row.contributions).toBe(0);
      expect(row.potContributions).toEqual([0, 0]);
      expect(row.potContributions).toHaveLength(row.potWithdrawals.length);
    }
  });

  it('keeps an empty pot alive while contributions are still coming', () => {
    // A pure accumulation plan: nothing saved yet, no spending, steady
    // deposits - this must not be declared depleted at the start
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 0,
          horizonYears: 5,
          captureRunDetail: 0,
          contributions: [makeContribution({ annualAmount: 10_000 })],
        },
        { startingBalance: 0, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.successRate).toBe(1);
    expect(result.runDetail!.map(row => row.endBalance)).toEqual([
      10_000, 20_000, 30_000, 40_000, 50_000,
    ]);
    for (
      let simulationIndex = 0;
      simulationIndex < result.simulationCount;
      simulationIndex++
    ) {
      expect(result.depletionYearBySimulation[simulationIndex]).toBe(-1);
    }
  });

  it('an empty zero-spend plan survives until delayed contributions begin', () => {
    // Nothing saved and nothing spent for the first two years; deposits
    // only start at age 62. The empty early years must not read as a
    // funding shortfall.
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 0,
          horizonYears: 5,
          captureRunDetail: 0,
          contributions: [
            makeContribution({ annualAmount: 10_000, fromAge: 62 }),
          ],
        },
        { startingBalance: 0, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.successRate).toBe(1);
    expect(result.runDetail!.map(row => row.endBalance)).toEqual([
      0, 0, 10_000, 20_000, 30_000,
    ]);
  });

  it('a funding shortfall still fails the plan despite pending contributions', () => {
    // Spending outstrips the pot in year 1; deposits starting at age 70
    // arrive too late to save it
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 20_000,
          horizonYears: 15,
          contributions: [
            makeContribution({ annualAmount: 5_000, fromAge: 70 }),
          ],
        },
        { startingBalance: 10_000, expectedReturnMean: 0, returnStdDev: 0 },
      ),
    );

    expect(result.successRate).toBe(0);
    expect(result.medianDepletionYear).toBe(1);
  });

  it('a contributing year reconciles column by column in the run detail', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 8_000,
          horizonYears: 3,
          captureRunDetail: 0,
          contributions: [makeContribution({ annualAmount: 10_000 })],
        },
        {
          startingBalance: 100_000,
          expectedReturnMean: 0,
          returnStdDev: 0,
          annualFeeFixed: 1_000,
        },
      ),
    );

    const rows = result.runDetail!;
    expect(rows.map(row => row.endBalance)).toEqual([
      101_000, 102_000, 103_000,
    ]);
    for (const row of rows) {
      expect(
        row.startBalance +
          row.contributions -
          row.withdrawal +
          row.growth -
          row.feesPaid,
      ).toBe(row.endBalance);
      expect(
        row.potContributions.reduce((sum, amount) => sum + amount, 0),
      ).toBe(row.contributions);
    }
  });

  it('fees alone can deplete a plan', () => {
    const result = runMonteCarloSimulation(
      makeParams(
        { annualWithdrawal: 0, horizonYears: 5 },
        {
          startingBalance: 1_000,
          expectedReturnMean: 0,
          returnStdDev: 0,
          annualFeeFixed: 400,
        },
      ),
    );

    expect(result.successRate).toBe(0);
    expect(result.medianDepletionYear).toBe(3);
  });

  it('keeps every output formatter-safe under absurdly large configs', () => {
    // A trillion at 100% yearly growth over a century overflows the safe
    // integer range many times over; the engine must clamp instead of
    // producing values the app's formatter refuses to render
    const result = runMonteCarloSimulation(
      makeParams(
        {
          annualWithdrawal: 1_000_000,
          horizonYears: 100,
          captureRunDetail: 0,
        },
        {
          // Over-cap input: clamped to MAX_AMOUNT before simulating
          startingBalance: 9_000_000_000_000_000,
          expectedReturnMean: 1,
          returnStdDev: 0.5,
        },
      ),
    );

    expect(result.percentileBands[0].p50).toBe(MAX_AMOUNT);

    // Outputs are capped at 2^50 - a factor of two below the formatter's
    // 2^51 - 1 limit, leaving room for chart axes to round ticks upward
    const maxFormattable = 2 ** 50;
    for (const band of result.percentileBands) {
      expect(band.p5).toBeGreaterThanOrEqual(0);
      expect(band.p90).toBeLessThanOrEqual(maxFormattable);
    }
    for (
      let simulationIndex = 0;
      simulationIndex < result.simulationCount;
      simulationIndex++
    ) {
      expect(result.endingBalances[simulationIndex]).toBeLessThanOrEqual(
        maxFormattable,
      );
      expect(
        result.totalWithdrawnBySimulation[simulationIndex],
      ).toBeLessThanOrEqual(maxFormattable);
    }
    for (const row of result.runDetail!) {
      const values = [
        row.startBalance,
        row.withdrawal,
        row.growth,
        row.endBalance,
        ...row.potBalances,
        ...row.potWithdrawals,
      ];
      for (const value of values) {
        expect(Number.isSafeInteger(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThanOrEqual(maxFormattable);
      }
    }
  });
});
