import type {
  MonteCarloAllocationPreset,
  MonteCarloPotMeta,
  MonteCarloReturnModel,
  MonteCarloSpendingPhaseMeta,
  MonteCarloWidget,
  MonteCarloWithdrawalRuleMeta,
  MonteCarloWithdrawalStrategy,
} from '@actual-app/core/types/models';

import { HISTORICAL_ANNUAL_RETURNS } from './monteCarloHistoricalReturns';
import type { HistoricalAnnualReturn } from './monteCarloHistoricalReturns';

// Illustrative nominal annual return assumptions for the allocation presets.
// These are deliberately easy to tweak; they only auto-fill the mean/stdDev
// inputs in the UI - the simulation itself reads just the numeric values.
export const ALLOCATION_PRESETS: Record<
  Exclude<MonteCarloAllocationPreset, 'custom'>,
  { mean: number; stdDev: number }
> = {
  'equity-100': { mean: 0.07, stdDev: 0.15 },
  'equity-80': { mean: 0.065, stdDev: 0.12 },
  'equity-60': { mean: 0.06, stdDev: 0.1 },
  'equity-40': { mean: 0.05, stdDev: 0.075 },
  cash: { mean: 0.03, stdDev: 0.015 },
};

// Asset mix behind each preset, used by the historical return models to
// blend the stocks/bonds/cash series into a single yearly return per pot
export const PRESET_ASSET_WEIGHTS: Record<
  Exclude<MonteCarloAllocationPreset, 'custom'>,
  { stocks: number; bonds: number; cash: number }
> = {
  'equity-100': { stocks: 1, bonds: 0, cash: 0 },
  'equity-80': { stocks: 0.8, bonds: 0.2, cash: 0 },
  'equity-60': { stocks: 0.6, bonds: 0.4, cash: 0 },
  'equity-40': { stocks: 0.4, bonds: 0.6, cash: 0 },
  cash: { stocks: 0, bonds: 0, cash: 1 },
};

/**
 * Money inputs above this are clamped (1e14 minor units = 1 trillion major
 * units); keeps even heavily compounded results within the range the
 * app's formatter accepts
 */
export const MAX_AMOUNT = 100_000_000_000_000;

/**
 * The largest integer amount loot-core's safeNumber will format (2^51 - 1,
 * tighter than MAX_SAFE_INTEGER so display division stays exact). Chart
 * axes must clamp synthesized tick values to this before formatting.
 */
export const MAX_FORMATTABLE_AMOUNT = 2 ** 51 - 1;

export const MIN_SIMULATION_COUNT = 1000;
export const MAX_SIMULATION_COUNT = 10000;
export const MIN_HORIZON_YEARS = 1;
export const MAX_HORIZON_YEARS = 100;

// Fixed PRNG seed so identical inputs always produce identical results -
// keeps the headline numbers stable across re-renders and tests exact.
export const DEFAULT_SIMULATION_SEED = 1234;

/** One phase of the planned spending path */
export type MonteCarloSpendingPhase = {
  id: string;
  name: string;
  /** Age the phase begins (inclusive); null = starts immediately */
  fromAge: number | null;
  /** Yearly spending in minor units, in today's money */
  annualWithdrawal: number;
};

export function createMonteCarloSpendingPhase(
  id: string,
  fromAge: number | null = null,
): MonteCarloSpendingPhase {
  return {
    id,
    name: '',
    fromAge,
    annualWithdrawal: 2_000_000, // 20,000.00 in minor units
  };
}

/** One invested pot with its own balance and return assumptions */
export type MonteCarloPot = {
  id: string;
  name: string;
  startingBalance: number; // integer minor units (cents)
  allocationPreset: MonteCarloAllocationPreset;
  expectedReturnMean: number; // decimal fraction
  returnStdDev: number; // decimal fraction
  /** Age from which the pot can fund withdrawals; null = immediately */
  accessAge: number | null;
  /**
   * Account whose live balance supplies the starting balance (resolved by
   * the UI before the simulation runs); null = manually entered balance
   */
  accountId: string | null;
};

export function createMonteCarloPot(id: string): MonteCarloPot {
  return {
    id,
    name: '',
    startingBalance: 50_000_000, // 500,000.00 in minor units
    allocationPreset: 'equity-60',
    expectedReturnMean: ALLOCATION_PRESETS['equity-60'].mean,
    returnStdDev: ALLOCATION_PRESETS['equity-60'].stdDev,
    accessAge: null,
    accountId: null,
  };
}

/**
 * The full set of simulation settings the user can configure. Stored in the
 * widget meta; new configuration options (withdrawal rules, fees, ...) should
 * be added here so the configuration UI and the engine stay in sync.
 */
/** Fully-populated withdrawal rule settings; `type` picks the active rule */
export type MonteCarloWithdrawalRuleConfig =
  Required<MonteCarloWithdrawalRuleMeta>;

export const WITHDRAWAL_RULE_DEFAULTS: MonteCarloWithdrawalRuleConfig = {
  type: 'none',
  // Guardrails (Guyton-Klinger's canonical 20% bands with 10% adjustments)
  prosperityTriggerPct: 0.2,
  prosperityIncreasePct: 0.1,
  preservationTriggerPct: 0.2,
  preservationCutPct: 0.1,
  // Ratcheting (Kitces)
  balanceThresholdMultiple: 1.5,
  consecutiveYears: 3,
  ratchetIncreasePct: 0.05,
  // Floor & ceiling (Bengen)
  floorPct: 0.15,
  ceilingPct: 0.2,
  // Boundaries
  upperRateThreshold: 0.06,
  upperCutPct: 0.1,
  lowerRateThreshold: 0.04,
  lowerIncreasePct: 0.05,
};

export type MonteCarloConfig = {
  pots: MonteCarloPot[];
  /** How the annual withdrawal is taken across pots */
  withdrawalStrategy: MonteCarloWithdrawalStrategy;
  /**
   * How yearly returns are generated: random normal draws, random samples
   * of historical years, or replays of actual historical sequences
   */
  returnModel: MonteCarloReturnModel;
  /** Dynamic withdrawal adjustment rule applied at the start of each year */
  withdrawalRule: MonteCarloWithdrawalRuleConfig;
  /** Minimum annual withdrawal in minor units; 0 = no floor */
  minimumWithdrawal: number;
  /** The planned spending path; each phase runs until the next one starts */
  spendingPhases: MonteCarloSpendingPhase[];
  /** Mean yearly inflation as a decimal fraction; null = flat withdrawals */
  inflationMean: number | null;
  /** Yearly inflation volatility as a decimal fraction; 0 = fixed rate */
  inflationStdDev: number;
  currentAge: number;
  /** Age the pot must last to; the horizon is targetAge - currentAge */
  targetAge: number;
  simulationCount: number;
};

export const MONTE_CARLO_DEFAULTS: MonteCarloConfig = {
  pots: [createMonteCarloPot('pot-1')],
  withdrawalStrategy: 'proportional',
  returnModel: 'normal',
  withdrawalRule: WITHDRAWAL_RULE_DEFAULTS,
  minimumWithdrawal: 0,
  spendingPhases: [createMonteCarloSpendingPhase('phase-1')],
  inflationMean: 0.025,
  inflationStdDev: 0.02,
  currentAge: 60,
  targetAge: 90,
  simulationCount: 5000,
};

/** Simulated years, derived from the configured ages */
export function getMonteCarloHorizonYears(
  config: Pick<MonteCarloConfig, 'currentAge' | 'targetAge'>,
): number {
  return clamp(
    Math.round(config.targetAge - config.currentAge),
    MIN_HORIZON_YEARS,
    MAX_HORIZON_YEARS,
  );
}

function potFromMeta(potMeta: MonteCarloPotMeta, index: number): MonteCarloPot {
  const defaults = createMonteCarloPot(potMeta.id || `pot-${index + 1}`);
  return {
    ...defaults,
    name: potMeta.name ?? defaults.name,
    startingBalance: potMeta.startingBalance ?? defaults.startingBalance,
    allocationPreset: potMeta.allocationPreset ?? defaults.allocationPreset,
    expectedReturnMean:
      potMeta.expectedReturnMean ?? defaults.expectedReturnMean,
    returnStdDev: potMeta.returnStdDev ?? defaults.returnStdDev,
    accessAge:
      potMeta.accessAge !== undefined ? potMeta.accessAge : defaults.accessAge,
    accountId: potMeta.accountId ?? null,
  };
}

function spendingPhaseFromMeta(
  phaseMeta: MonteCarloSpendingPhaseMeta,
  index: number,
): MonteCarloSpendingPhase {
  const defaults = createMonteCarloSpendingPhase(
    phaseMeta.id || `phase-${index + 1}`,
  );
  return {
    ...defaults,
    name: phaseMeta.name ?? defaults.name,
    fromAge: phaseMeta.fromAge !== undefined ? phaseMeta.fromAge : null,
    annualWithdrawal: phaseMeta.annualWithdrawal ?? defaults.annualWithdrawal,
  };
}

export function monteCarloConfigFromMeta(
  meta: MonteCarloWidget['meta'] | undefined,
): MonteCarloConfig {
  return {
    pots: meta?.pots?.length
      ? meta.pots.map(potFromMeta)
      : [createMonteCarloPot('pot-1')],
    withdrawalStrategy:
      meta?.withdrawalStrategy ?? MONTE_CARLO_DEFAULTS.withdrawalStrategy,
    returnModel: meta?.returnModel ?? MONTE_CARLO_DEFAULTS.returnModel,
    withdrawalRule: { ...WITHDRAWAL_RULE_DEFAULTS, ...meta?.withdrawalRule },
    minimumWithdrawal:
      meta?.minimumWithdrawal ?? MONTE_CARLO_DEFAULTS.minimumWithdrawal,
    spendingPhases: meta?.spendingPhases?.length
      ? meta.spendingPhases.map(spendingPhaseFromMeta)
      : [createMonteCarloSpendingPhase('phase-1')],
    inflationMean:
      meta?.inflationMean !== undefined
        ? meta.inflationMean
        : MONTE_CARLO_DEFAULTS.inflationMean,
    inflationStdDev:
      meta?.inflationStdDev ?? MONTE_CARLO_DEFAULTS.inflationStdDev,
    currentAge: meta?.currentAge ?? MONTE_CARLO_DEFAULTS.currentAge,
    targetAge: meta?.targetAge ?? MONTE_CARLO_DEFAULTS.targetAge,
    simulationCount:
      meta?.simulationCount ?? MONTE_CARLO_DEFAULTS.simulationCount,
  };
}

// The engine mostly thinks in years; callers derive horizonYears from the
// configured ages via getMonteCarloHorizonYears. currentAge is still needed
// to know when each pot's access age is reached.
export type MonteCarloParams = Omit<MonteCarloConfig, 'targetAge'> & {
  horizonYears: number;
  seed?: number;
  /** Override the bundled historical dataset (used in tests) */
  historicalReturns?: HistoricalAnnualReturn[];
  /**
   * Sim index to capture year-by-year detail for. Because runs are seeded,
   * re-running with the same params reproduces any run exactly.
   */
  captureRunDetail?: number;
  /**
   * Convert all monetary outputs to today's money by discounting with the
   * configured inflation rate. Success rates and depletion timing are
   * unaffected - this only changes how balances and withdrawals read.
   */
  deflateToTodaysMoney?: boolean;
};

/** One simulated year of a single captured run, values in minor units */
export type MonteCarloRunDetailRow = {
  year: number;
  /** Total balance at the start of the year, before the withdrawal */
  startBalance: number;
  /** Amount actually withdrawn (the accessible remainder on failure) */
  withdrawal: number;
  /** Investment gain/loss applied after the withdrawal */
  growth: number;
  endBalance: number;
  /** End-of-year balance per pot, in the order the pots are configured */
  potBalances: number[];
  /** How much of this year's withdrawal each pot funded, same order */
  potWithdrawals: number[];
  /**
   * The return each pot actually experienced that year, as a decimal
   * fraction; null when the pot had no balance or the plan failed
   */
  potReturns: Array<number | null>;
  /**
   * Set on a failure year when money remained in pots that hadn't reached
   * their access age - the plan failed despite this locked balance
   */
  inaccessibleBalance?: number;
};

export type MonteCarloPercentileBand = {
  /** 0 = starting point, 1..horizonYears = end of that year */
  year: number;
  p5: number;
  p10: number;
  p25: number;
  p30: number;
  p50: number;
  p70: number;
  p75: number;
  p90: number;
};

export type MonteCarloResult = {
  /** Fraction (0..1) of simulations that survived the full horizon */
  successRate: number;
  percentileBands: MonteCarloPercentileBand[];
  /** One entry per year 1..horizonYears; count of sims depleted in that year */
  depletionHistogram: Array<{ year: number; count: number }>;
  /** Cumulative depletion probability, indexed by year (0..horizonYears) */
  depletionProbabilityByYear: number[];
  /** Median ending balance across all simulations, in minor units */
  medianEndingBalance: number;
  /**
   * Median across simulations of the total amount actually withdrawn over
   * the horizon, in minor units - shows the income cost of withdrawal rules
   */
  medianTotalWithdrawn: number;
  /** Median depletion year among failed simulations, or null if none failed */
  medianDepletionYear: number | null;
  earliestDepletionYear: number | null;
  latestDepletionYear: number | null;
  /**
   * Balance path (year 0..horizonYears, minor units) of the single unluckiest
   * simulation: the one that ran out of money earliest, or the one with the
   * lowest ending balance if none ran out.
   */
  worstRunPath: number[];
  /** Final balance of every simulation, in minor units */
  endingBalances: Float64Array;
  /** Depletion year per simulation; -1 = survived the full horizon */
  depletionYearBySim: Int32Array;
  /** Total amount withdrawn over the horizon per simulation */
  totalWithdrawnBySim: Float64Array;
  /** Year-by-year rows for the sim requested via captureRunDetail */
  runDetail?: MonteCarloRunDetailRow[];
  simulationCount: number;
  horizonYears: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Small deterministic PRNG (mulberry32) - no dependencies needed.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard normal draw via the Box-Muller transform.
function makeNormalSampler(random: () => number) {
  return function nextNormal() {
    // Avoid log(0) by shifting u1 into (0, 1]
    const u1 = 1 - random();
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

function percentileOfSorted(sorted: Float64Array, p: number) {
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Runs the drawdown simulation with i.i.d. normal annual returns.
 *
 * Each year, in each simulation: the withdrawal is taken at the start of the
 * year across the pots that have reached their access age (proportionally to
 * their balances, or draining pots in order); if the accessible pots can't
 * cover it the simulation is marked depleted for that year (balances clamped
 * to 0 for the rest of the path), even if locked pots still hold money;
 * otherwise each pot gets its own randomly drawn return for the year. When an
 * inflation rate is set, next year's withdrawal grows by it. Returns are
 * nominal - inflation only grows withdrawals, so it is never double-counted.
 * Pot returns are drawn independently (no cross-pot correlation).
 */
export function runMonteCarloSimulation(
  params: MonteCarloParams,
): MonteCarloResult {
  const pots = params.pots.length > 0 ? params.pots : MONTE_CARLO_DEFAULTS.pots;
  const potCount = pots.length;
  const potStartBalances = pots.map(pot =>
    clamp(pot.startingBalance, 0, MAX_AMOUNT),
  );
  const potMeans = pots.map(pot => pot.expectedReturnMean);
  const potStdDevs = pots.map(pot => Math.max(0, pot.returnStdDev));
  const isSequential = params.withdrawalStrategy === 'sequential';
  const isBestPerformer = params.withdrawalStrategy === 'best-performer';
  const isTargetMix = params.withdrawalStrategy === 'target-mix';
  // Best-performer order: each pot's return from the previous simulated
  // year, and a reusable index buffer for the per-year drain order
  const prevReturns = new Float64Array(potCount);
  const drainOrder = pots.map((_, index) => index);
  // Target-mix order: each pot's target weight is its share of the
  // starting balances; this holds each pot's ideal post-withdrawal balance
  const potIdealBalances = new Float64Array(potCount);

  // First simulation year (1-based) in which each pot can fund withdrawals.
  // The year-y withdrawal happens at age currentAge + (y - 1).
  const potAccessFromYear = pots.map(pot =>
    pot.accessAge == null
      ? 1
      : Math.max(1, Math.round(pot.accessAge - params.currentAge) + 1),
  );

  const returnModel = params.returnModel;
  const history = params.historicalReturns?.length
    ? params.historicalReturns
    : HISTORICAL_ANNUAL_RETURNS;
  const historyCount = history.length;

  // For historical models, each preset pot gets the blended return of its
  // asset mix in every historical year. 'custom' pots have no asset mix, so
  // they keep using normal draws around their own mean/volatility.
  const potHistoricalReturns: Array<Float64Array | null> = pots.map(pot => {
    if (returnModel === 'normal' || pot.allocationPreset === 'custom') {
      return null;
    }
    const weights = PRESET_ASSET_WEIGHTS[pot.allocationPreset];
    const blended = new Float64Array(historyCount);
    for (let i = 0; i < historyCount; i++) {
      blended[i] =
        weights.stocks * history[i].stocks +
        weights.bonds * history[i].bonds +
        weights.cash * history[i].cash;
    }
    return blended;
  });
  // Whether any pot's return comes from a normal draw (the whole normal
  // model, plus custom pots in historical modes)
  const hasNormalDrawPot = potHistoricalReturns.some(
    blended => blended === null,
  );

  const inflationMean = params.inflationMean;
  const inflationStdDev =
    inflationMean != null ? Math.max(0, params.inflationStdDev) : 0;
  const horizonYears = clamp(
    Math.round(params.horizonYears),
    MIN_HORIZON_YEARS,
    MAX_HORIZON_YEARS,
  );

  // The planned spending path in today's money: the active phase's amount
  // for every year. Inflation is applied per simulation, since each replay
  // draws its own inflation path when volatility is set.
  const spendingPhases = params.spendingPhases.length
    ? [...params.spendingPhases].sort(
        (a, b) => (a.fromAge ?? -Infinity) - (b.fromAge ?? -Infinity),
      )
    : [createMonteCarloSpendingPhase('phase-1')];
  const plannedTodayByYear = new Float64Array(horizonYears + 1);
  for (let year = 1; year <= horizonYears; year++) {
    const age = params.currentAge + year - 1;
    let amount = clamp(spendingPhases[0].annualWithdrawal, 0, MAX_AMOUNT);
    for (const phase of spendingPhases) {
      if (phase.fromAge == null || phase.fromAge <= age) {
        amount = clamp(phase.annualWithdrawal, 0, MAX_AMOUNT);
      } else {
        break;
      }
    }
    plannedTodayByYear[year] = amount;
  }

  // When showing values in today's money, outputs are discounted by each
  // replay's own realized inflation path
  const deflate = params.deflateToTodaysMoney === true && inflationMean != null;
  // Sequence replay runs exactly one scenario per historical start year
  // (wrapping around the end of the dataset); the simulation count input
  // doesn't apply there
  const simulationCount =
    returnModel === 'historical-sequence'
      ? historyCount
      : clamp(
          Math.round(params.simulationCount),
          MIN_SIMULATION_COUNT,
          MAX_SIMULATION_COUNT,
        );

  const random = mulberry32(params.seed ?? DEFAULT_SIMULATION_SEED);
  const nextNormal = makeNormalSampler(random);

  // Year-major balance buffers (totals across pots): balancesByYear[year][sim]
  const balancesByYear: Float64Array[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    balancesByYear.push(new Float64Array(simulationCount));
  }

  const depletionCounts = new Array<number>(horizonYears + 1).fill(0);
  let survivedCount = 0;

  // The unluckiest simulation: earliest depletion, or lowest ending balance
  let worstSimIndex = 0;
  let worstDepletionYear = Infinity;
  let worstFinalBalance = Infinity;

  const startingTotal = potStartBalances.reduce((sum, b) => sum + b, 0);
  const potBalances = new Float64Array(potCount);

  const rule = params.withdrawalRule;
  const minimumWithdrawal = clamp(params.minimumWithdrawal, 0, MAX_AMOUNT);

  // Keep every emitted amount within the range the formatter accepts -
  // absurd configs flat-line at the cap instead of crashing the report.
  // Capped a factor of two below MAX_FORMATTABLE_AMOUNT so chart axes can
  // round their top tick above the data maximum and still format it
  const maxEmitted = 2 ** 50;
  function toSafeAmount(value: number) {
    return clamp(value, -maxEmitted, maxEmitted);
  }
  // Starting wealth that is accessible in each simulated year. Withdrawal
  // rules measure rates against the pots that can actually fund spending -
  // a locked pension mustn't earn prosperity raises during a bridge, and
  // starts counting the moment it unlocks
  const accessibleStartByYear = new Float64Array(horizonYears + 1);
  for (let year = 1; year <= horizonYears; year++) {
    let accessibleStart = 0;
    for (let p = 0; p < potCount; p++) {
      if (year >= potAccessFromYear[p]) {
        accessibleStart += potStartBalances[p];
      }
    }
    accessibleStartByYear[year] = accessibleStart;
  }

  const initialRate =
    accessibleStartByYear[1] > 0
      ? plannedTodayByYear[1] / accessibleStartByYear[1]
      : 0;
  const withdrawnTotals = new Float64Array(simulationCount);
  const depletionYearBySim = new Int32Array(simulationCount).fill(-1);

  const captureIndex = params.captureRunDetail ?? -1;
  const runDetail: MonteCarloRunDetailRow[] | undefined =
    captureIndex >= 0 && captureIndex < simulationCount ? [] : undefined;

  for (let sim = 0; sim < simulationCount; sim++) {
    potBalances.set(potStartBalances);
    prevReturns.fill(0);
    let total = startingTotal;
    // Cuts/raises from the withdrawal rule compound here, applied on top of
    // the planned spending path (so they persist across spending phases)
    let adjustmentFactor = 1;
    // This replay's realized inflation path: each year draws its own rate
    // when inflation volatility is set
    let cumInflation = 1;
    let ratchetStreak = 0;
    let withdrawnSum = 0;
    let depleted = false;
    let simDepletionYear = Infinity;

    balancesByYear[0][sim] = toSafeAmount(total);

    for (let year = 1; year <= horizonYears; year++) {
      if (!depleted) {
        const invStart = deflate ? 1 / cumInflation : 1;
        const planned = plannedTodayByYear[year] * cumInflation;
        let withdrawal: number;

        // Only pots that have reached their access age can fund this year's
        // withdrawal; locked pots stay invested but untouchable
        let accessibleTotal = 0;
        let lastAccessibleIndex = -1;
        for (let p = 0; p < potCount; p++) {
          if (year >= potAccessFromYear[p]) {
            accessibleTotal += potBalances[p];
            lastAccessibleIndex = p;
          }
        }

        // Apply the dynamic withdrawal rule before taking this year's
        // withdrawal (from year 2 - year 1 always uses the planned amount).
        // Rules evaluate accessible wealth only: locked pots can't fund
        // spending, so they must not drive cuts or raises until they unlock
        if (year > 1 && rule.type === 'floor-ceiling') {
          // Recompute rule: a fixed share of the accessible balance, kept
          // within limits around the planned spending
          withdrawal = clamp(
            initialRate * accessibleTotal,
            planned * (1 - rule.floorPct),
            planned * (1 + rule.ceilingPct),
          );
        } else {
          if (
            year > 1 &&
            rule.type !== 'none' &&
            accessibleTotal > 0 &&
            accessibleStartByYear[year] > 0
          ) {
            const currentRate = (planned * adjustmentFactor) / accessibleTotal;
            if (rule.type === 'guardrails') {
              // Drift is measured against the planned spending path, not
              // the year-1 rate, so a deliberate phase change doesn't
              // read as a trigger - only market-driven drift does.
              // Identical to the year-1 anchor for single-phase plans.
              const referenceRate =
                plannedTodayByYear[year] / accessibleStartByYear[year];
              if (
                currentRate >
                referenceRate * (1 + rule.preservationTriggerPct)
              ) {
                adjustmentFactor *= 1 - rule.preservationCutPct;
              } else if (
                currentRate <
                referenceRate * (1 - rule.prosperityTriggerPct)
              ) {
                adjustmentFactor *= 1 + rule.prosperityIncreasePct;
              }
            } else if (rule.type === 'ratcheting') {
              if (
                accessibleTotal >
                accessibleStartByYear[year] * rule.balanceThresholdMultiple
              ) {
                ratchetStreak++;
                if (ratchetStreak >= rule.consecutiveYears) {
                  adjustmentFactor *= 1 + rule.ratchetIncreasePct;
                  ratchetStreak = 0;
                }
              } else {
                ratchetStreak = 0;
              }
            } else if (rule.type === 'boundaries') {
              if (currentRate > rule.upperRateThreshold) {
                adjustmentFactor *= 1 - rule.upperCutPct;
              } else if (currentRate < rule.lowerRateThreshold) {
                adjustmentFactor *= 1 + rule.lowerIncreasePct;
              }
            }
          }
          withdrawal = planned * adjustmentFactor;
        }
        // The minimum floor belongs to the withdrawal rule system (the UI
        // only offers it alongside a rule); with no rule active the planned
        // spending is taken as-is. Like the phase amounts it's in today's
        // money, so it rises with this replay's inflation path
        const minimumThisYear = minimumWithdrawal * cumInflation;
        if (
          rule.type !== 'none' &&
          minimumWithdrawal > 0 &&
          withdrawal < minimumThisYear
        ) {
          withdrawal = minimumThisYear;
        }

        const yearStartTotal = total;
        let withdrawalTaken: number;
        let fundingShortfall = false;

        // Per-pot balances at the point of failure: accessible pots are
        // consumed, locked pots keep their money
        let failurePotSnapshot: number[] | null = null;
        const capturedPotReturns =
          runDetail && sim === captureIndex
            ? new Array<number | null>(potCount).fill(null)
            : null;
        // Starts as a copy of the pre-withdrawal balances; after the split
        // it holds how much of the withdrawal each pot funded
        const capturedPotWithdrawals = capturedPotReturns
          ? Array.from(potBalances)
          : null;

        if (accessibleTotal <= withdrawal) {
          fundingShortfall = true;
          // The accessible pots can't cover this year's withdrawal (locked
          // pots may still hold money, but the plan failed to fund spending);
          // they get whatever was reachable
          withdrawnSum = toSafeAmount(
            withdrawnSum + accessibleTotal * invStart,
          );
          withdrawalTaken = accessibleTotal;
          if (runDetail && sim === captureIndex) {
            failurePotSnapshot = Array.from(potBalances, (balance, p) =>
              year >= potAccessFromYear[p] ? 0 : Math.round(balance),
            );
          }
          potBalances.fill(0);
          total = 0;
          depleted = true;
          simDepletionYear = year;
          depletionCounts[year]++;
        } else {
          withdrawnSum = toSafeAmount(withdrawnSum + withdrawal * invStart);
          withdrawalTaken = withdrawal;
          if (isSequential || isBestPerformer) {
            if (isBestPerformer) {
              // Drain the pot with the highest return last year first;
              // ties (and year 1, when no returns exist yet) fall back to
              // the listed order via the stable sort
              for (let i = 0; i < potCount; i++) {
                drainOrder[i] = i;
              }
              drainOrder.sort((a, b) => prevReturns[b] - prevReturns[a]);
            }
            let remaining = withdrawal;
            for (let i = 0; i < potCount && remaining > 0; i++) {
              const p = isBestPerformer ? drainOrder[i] : i;
              if (year < potAccessFromYear[p]) {
                continue;
              }
              const take = Math.min(potBalances[p], remaining);
              potBalances[p] -= take;
              remaining -= take;
            }
          } else if (isTargetMix) {
            // Withdraw so the accessible pots move back toward their target
            // mix (weights = shares of the starting balances, renormalized
            // over whichever pots are unlocked this year): each pot ideally
            // ends at its target share of the post-withdrawal total, so the
            // withdrawal comes from overweight pots, most overweight first
            let targetAccessible = 0;
            for (let p = 0; p < potCount; p++) {
              if (year >= potAccessFromYear[p]) {
                targetAccessible += potStartBalances[p];
              }
            }
            const remainingTotal = accessibleTotal - withdrawal;
            for (let p = 0; p < potCount; p++) {
              drainOrder[p] = p;
              potIdealBalances[p] =
                year >= potAccessFromYear[p] && targetAccessible > 0
                  ? (potStartBalances[p] / targetAccessible) * remainingTotal
                  : 0;
            }
            drainOrder.sort(
              (a, b) =>
                potBalances[b] -
                potIdealBalances[b] -
                (potBalances[a] - potIdealBalances[a]),
            );
            let remaining = withdrawal;
            for (let i = 0; i < potCount && remaining > 0; i++) {
              const p = drainOrder[i];
              if (year < potAccessFromYear[p]) {
                continue;
              }
              const excess = potBalances[p] - potIdealBalances[p];
              if (excess <= 0) {
                continue;
              }
              const take = Math.min(remaining, potBalances[p], excess);
              potBalances[p] -= take;
              remaining -= take;
            }
            // Float-drift safety net: drain any accessible pot for whatever
            // tiny residue the excess passes left behind
            for (let p = 0; p < potCount && remaining > 0; p++) {
              if (year < potAccessFromYear[p]) {
                continue;
              }
              const take = Math.min(potBalances[p], remaining);
              potBalances[p] -= take;
              remaining -= take;
            }
          } else {
            // Proportional split across accessible pots; the last accessible
            // pot takes the remainder so the total drops by exactly the
            // withdrawal (no float drift)
            let remaining = withdrawal;
            for (let p = 0; p < lastAccessibleIndex; p++) {
              if (year < potAccessFromYear[p]) {
                continue;
              }
              const take = withdrawal * (potBalances[p] / accessibleTotal);
              potBalances[p] -= take;
              remaining -= take;
            }
            potBalances[lastAccessibleIndex] -= remaining;
          }

          if (capturedPotWithdrawals) {
            for (let p = 0; p < potCount; p++) {
              capturedPotWithdrawals[p] -= potBalances[p];
            }
          }

          // Every pot experiences the same market year: historical models
          // pick one history year for all pots, and normally-drawn pots
          // share one market shock scaled by their own volatility. Pots
          // holding the same investments therefore earn the same return.
          let historyIndex = -1;
          if (returnModel === 'historical-bootstrap') {
            historyIndex = Math.floor(random() * historyCount);
          } else if (returnModel === 'historical-sequence') {
            historyIndex = (sim + year - 1) % historyCount;
          }
          const marketShock = hasNormalDrawPot ? nextNormal() : 0;

          total = 0;
          for (let p = 0; p < potCount; p++) {
            if (potBalances[p] > 0) {
              const blended = potHistoricalReturns[p];
              const yearReturn =
                blended && historyIndex >= 0
                  ? blended[historyIndex]
                  : potMeans[p] + potStdDevs[p] * marketShock;
              if (capturedPotReturns) {
                capturedPotReturns[p] = yearReturn;
              }
              prevReturns[p] = yearReturn;
              potBalances[p] *= 1 + yearReturn;
              if (potBalances[p] <= 0) {
                // A sub-(-100%) return draw wiped this pot out
                potBalances[p] = 0;
              }
            }
            total += potBalances[p];
          }
          if (total <= 0) {
            total = 0;
            depleted = true;
            simDepletionYear = year;
            depletionCounts[year]++;
          }
        }

        // Realize this year's inflation, drawing a random rate when
        // volatility is set (fixed mean otherwise)
        if (inflationMean != null) {
          const yearInflation =
            inflationStdDev > 0
              ? Math.max(-0.9, inflationMean + inflationStdDev * nextNormal())
              : inflationMean;
          cumInflation *= 1 + yearInflation;
        }
        const invEnd = deflate ? 1 / cumInflation : 1;

        if (runDetail && sim === captureIndex) {
          const startInv = invStart;
          const endInv = invEnd;
          if (fundingShortfall) {
            // The plan failed to fund this year's spending; any remaining
            // balance was locked in pots not yet accessible, not lost to
            // markets
            const locked = toSafeAmount(
              Math.round((yearStartTotal - withdrawalTaken) * startInv),
            );
            runDetail.push({
              year,
              startBalance: toSafeAmount(Math.round(yearStartTotal * startInv)),
              withdrawal: toSafeAmount(Math.round(withdrawalTaken * startInv)),
              growth: 0,
              endBalance: 0,
              potBalances: (failurePotSnapshot ?? []).map(balance =>
                toSafeAmount(Math.round(balance * startInv)),
              ),
              // On a shortfall the accessible pots gave up everything they
              // had; locked pots funded nothing
              potWithdrawals: (capturedPotWithdrawals ?? []).map(
                (balance, p) =>
                  year >= potAccessFromYear[p]
                    ? toSafeAmount(Math.round(balance * startInv))
                    : 0,
              ),
              potReturns: capturedPotReturns ?? [],
              ...(locked > 0 && { inaccessibleBalance: locked }),
            });
          } else {
            runDetail.push({
              year,
              startBalance: toSafeAmount(Math.round(yearStartTotal * startInv)),
              withdrawal: toSafeAmount(Math.round(withdrawalTaken * startInv)),
              // In today's money, growth is the real gain: the inflation
              // drag comes out of it
              growth: toSafeAmount(
                Math.round(
                  total * endInv -
                    (yearStartTotal - withdrawalTaken) * startInv,
                ),
              ),
              endBalance: toSafeAmount(Math.round(total * endInv)),
              potBalances: Array.from(potBalances, balance =>
                toSafeAmount(Math.round(balance * endInv)),
              ),
              potWithdrawals: (capturedPotWithdrawals ?? []).map(take =>
                toSafeAmount(Math.round(take * startInv)),
              ),
              potReturns: (capturedPotReturns ?? []).map(potReturn =>
                potReturn == null
                  ? null
                  : (1 + potReturn) * (endInv / startInv) - 1,
              ),
            });
          }
        }

        // Store this replay's balance, in today's money when deflating
        balancesByYear[year][sim] = toSafeAmount(total * invEnd);
      }
      // Post-depletion years stay at zero (total is 0 here)
    }

    withdrawnTotals[sim] = withdrawnSum;
    if (simDepletionYear !== Infinity) {
      depletionYearBySim[sim] = simDepletionYear;
    }

    if (!depleted) {
      survivedCount++;
    }

    if (
      simDepletionYear < worstDepletionYear ||
      (simDepletionYear === worstDepletionYear && total < worstFinalBalance)
    ) {
      worstSimIndex = sim;
      worstDepletionYear = simDepletionYear;
      worstFinalBalance = total;
    }
  }

  const worstRunPath: number[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    worstRunPath.push(Math.round(balancesByYear[year][worstSimIndex]));
  }

  const percentileBands: MonteCarloPercentileBand[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    const sorted = balancesByYear[year].slice().sort();
    percentileBands.push({
      year,
      p5: Math.round(percentileOfSorted(sorted, 0.05)),
      p10: Math.round(percentileOfSorted(sorted, 0.1)),
      p25: Math.round(percentileOfSorted(sorted, 0.25)),
      p30: Math.round(percentileOfSorted(sorted, 0.3)),
      p50: Math.round(percentileOfSorted(sorted, 0.5)),
      p70: Math.round(percentileOfSorted(sorted, 0.7)),
      p75: Math.round(percentileOfSorted(sorted, 0.75)),
      p90: Math.round(percentileOfSorted(sorted, 0.9)),
    });
  }

  const depletionHistogram: Array<{ year: number; count: number }> = [];
  for (let year = 1; year <= horizonYears; year++) {
    depletionHistogram.push({ year, count: depletionCounts[year] });
  }

  const depletionProbabilityByYear: number[] = [0];
  let cumulativeDepleted = 0;
  for (let year = 1; year <= horizonYears; year++) {
    cumulativeDepleted += depletionCounts[year];
    depletionProbabilityByYear.push(cumulativeDepleted / simulationCount);
  }

  const depletionYears: number[] = [];
  for (let year = 1; year <= horizonYears; year++) {
    for (let i = 0; i < depletionCounts[year]; i++) {
      depletionYears.push(year);
    }
  }

  const finalSorted = balancesByYear[horizonYears].slice().sort();
  const withdrawnSorted = withdrawnTotals.slice().sort();

  return {
    successRate: survivedCount / simulationCount,
    percentileBands,
    depletionHistogram,
    depletionProbabilityByYear,
    medianEndingBalance: Math.round(percentileOfSorted(finalSorted, 0.5)),
    medianTotalWithdrawn: Math.round(percentileOfSorted(withdrawnSorted, 0.5)),
    medianDepletionYear:
      depletionYears.length > 0
        ? depletionYears[Math.floor((depletionYears.length - 1) / 2)]
        : null,
    earliestDepletionYear: depletionYears.length > 0 ? depletionYears[0] : null,
    latestDepletionYear:
      depletionYears.length > 0
        ? depletionYears[depletionYears.length - 1]
        : null,
    worstRunPath,
    endingBalances: balancesByYear[horizonYears].slice(),
    depletionYearBySim,
    totalWithdrawnBySim: withdrawnTotals,
    runDetail,
    simulationCount,
    horizonYears,
  };
}
