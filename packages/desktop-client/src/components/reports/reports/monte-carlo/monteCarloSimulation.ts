import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import type {
  MonteCarloAllocationPreset,
  MonteCarloContributionMeta,
  MonteCarloPotMeta,
  MonteCarloReturnModel,
  MonteCarloSpendingPhaseMeta,
  MonteCarloTaxBandMeta,
  MonteCarloTaxModel,
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
const PRESET_ASSET_WEIGHTS: Record<
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
 * The largest integer amount loot-core's safeNumber will format (tighter
 * than MAX_SAFE_INTEGER so display division stays exact). Chart axes must
 * clamp synthesized tick values to this before formatting.
 */
export const MAX_FORMATTABLE_AMOUNT = MAX_SAFE_NUMBER;

export const MIN_SIMULATION_COUNT = 1000;
export const MAX_SIMULATION_COUNT = 10000;
export const MIN_HORIZON_YEARS = 1;
export const MAX_HORIZON_YEARS = 100;

// Upper bounds shared by the engine's input clamps and the UI's inputs,
// so validation and simulation can't drift apart
export const MAX_WITHDRAWAL_TAX_RATE = 0.75;
export const MAX_TAX_BAND_RATE = 0.99;
export const MAX_ANNUAL_FEE_RATE = 0.1;

// Fixed PRNG seed so identical inputs always produce identical results -
// keeps the headline numbers stable across re-renders and tests exact.
const DEFAULT_SIMULATION_SEED = 1234;

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

/**
 * Phases ordered by starting age (no-age phase first) - the order the
 * engine resolves them in, shared with the UI so they can't disagree
 */
export function sortMonteCarloSpendingPhases(
  phases: MonteCarloSpendingPhase[],
): MonteCarloSpendingPhase[] {
  return [...phases].sort(
    (phaseA, phaseB) =>
      (phaseA.fromAge ?? -Infinity) - (phaseB.fromAge ?? -Infinity),
  );
}

/** One recurring yearly contribution into a pot over an age window */
export type MonteCarloContribution = {
  id: string;
  name: string;
  /** The pot the contribution is paid into */
  potId: string;
  /** Age the contribution starts (inclusive); null = starts now */
  fromAge: number | null;
  /** Age the contribution stops (inclusive); null = end of plan */
  toAge: number | null;
  /** Yearly amount in minor units, in today's money */
  annualAmount: number;
  /** Whether the amount rises with inflation */
  adjustsWithInflation: boolean;
};

export function createMonteCarloContribution(
  id: string,
  potId: string,
): MonteCarloContribution {
  return {
    id,
    name: '',
    potId,
    fromAge: null,
    toAge: null,
    annualAmount: 1_000_000, // 10,000.00 in minor units
    adjustsWithInflation: true,
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
  /** Flat tax model: effective tax rate on withdrawals (decimal fraction) */
  withdrawalTaxRate: number;
  /** Bands tax model: share of a withdrawal counted as taxable income */
  taxableFraction: number;
  /** Fixed yearly fee in minor units, today's money */
  annualFeeFixed: number;
  /** Whether the fixed fee rises with inflation */
  feeAdjustsWithInflation: boolean;
  /** Yearly fee as a fraction of the end-of-year balance */
  annualFeeRate: number;
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
    withdrawalTaxRate: 0,
    taxableFraction: 1,
    annualFeeFixed: 0,
    feeAdjustsWithInflation: false,
    annualFeeRate: 0,
  };
}

/** One tax band: annual taxable income from `from` upward taxed at `rate` */
export type MonteCarloTaxBand = {
  id: string;
  /** Threshold in minor units, in today's money */
  from: number;
  /** Decimal fraction (0.2 = 20%) */
  rate: number;
};

export function createMonteCarloTaxBand(
  id: string,
  from = 0,
): MonteCarloTaxBand {
  return { id, from, rate: 0 };
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
  /** Recurring yearly contributions paid into pots */
  contributions: MonteCarloContribution[];
  /** Mean yearly inflation as a decimal fraction; null = flat withdrawals */
  inflationMean: number | null;
  /** Yearly inflation volatility as a decimal fraction; 0 = fixed rate */
  inflationStdDev: number;
  /** How withdrawals are taxed: flat rate per pot, or progressive bands */
  taxModel: MonteCarloTaxModel;
  /** Bands model: progressive bands over annual taxable income */
  taxBands: MonteCarloTaxBand[];
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
  contributions: [],
  inflationMean: 0.025,
  inflationStdDev: 0.02,
  taxModel: 'flat',
  taxBands: [createMonteCarloTaxBand('band-1')],
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
    accessAge: potMeta.accessAge ?? null,
    accountId: potMeta.accountId ?? null,
    withdrawalTaxRate: potMeta.withdrawalTaxRate ?? defaults.withdrawalTaxRate,
    taxableFraction: potMeta.taxableFraction ?? defaults.taxableFraction,
    annualFeeFixed: potMeta.annualFeeFixed ?? defaults.annualFeeFixed,
    feeAdjustsWithInflation:
      potMeta.feeAdjustsWithInflation ?? defaults.feeAdjustsWithInflation,
    annualFeeRate: potMeta.annualFeeRate ?? defaults.annualFeeRate,
  };
}

function taxBandFromMeta(
  bandMeta: MonteCarloTaxBandMeta,
  index: number,
): MonteCarloTaxBand {
  const defaults = createMonteCarloTaxBand(bandMeta.id || `band-${index + 1}`);
  return {
    ...defaults,
    from: bandMeta.from ?? defaults.from,
    rate: bandMeta.rate ?? defaults.rate,
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
    fromAge: phaseMeta.fromAge ?? null,
    annualWithdrawal: phaseMeta.annualWithdrawal ?? defaults.annualWithdrawal,
  };
}

function contributionFromMeta(
  contributionMeta: MonteCarloContributionMeta,
  index: number,
): MonteCarloContribution {
  const defaults = createMonteCarloContribution(
    contributionMeta.id || `contribution-${index + 1}`,
    contributionMeta.potId ?? '',
  );
  return {
    ...defaults,
    name: contributionMeta.name ?? defaults.name,
    fromAge: contributionMeta.fromAge ?? null,
    toAge: contributionMeta.toAge ?? null,
    annualAmount: contributionMeta.annualAmount ?? defaults.annualAmount,
    adjustsWithInflation:
      contributionMeta.adjustsWithInflation ?? defaults.adjustsWithInflation,
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
    contributions: meta?.contributions?.length
      ? meta.contributions.map(contributionFromMeta)
      : [],
    inflationMean:
      meta?.inflationMean !== undefined
        ? meta.inflationMean
        : MONTE_CARLO_DEFAULTS.inflationMean,
    inflationStdDev:
      meta?.inflationStdDev ?? MONTE_CARLO_DEFAULTS.inflationStdDev,
    taxModel: meta?.taxModel ?? MONTE_CARLO_DEFAULTS.taxModel,
    taxBands: meta?.taxBands?.length
      ? meta.taxBands.map(taxBandFromMeta)
      : [createMonteCarloTaxBand('band-1')],
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
  /** Start-of-year balance per pot, before contributions and the
   * withdrawal, same order */
  potStartBalances: number[];
  /** Contributions paid in at the start of this year */
  contributions: number;
  /** Contribution each pot received at the start of the year, same order */
  potContributions: number[];
  /** How much of this year's withdrawal each pot funded (gross), same order */
  potWithdrawals: number[];
  /**
   * Tax attributed to each pot's withdrawal: exact under the flat model,
   * prorated by taxable-income share under the bands model
   */
  potTaxes: number[];
  /**
   * The slice of each pot's withdrawal assessed for tax: taxable fraction
   * of the take under the bands model, the whole take under a nonzero
   * flat rate, 0 with no tax
   */
  potTaxables: number[];
  /** Tax paid out of this year's gross withdrawal (0 with no tax model) */
  taxPaid: number;
  /** Management fees charged at the end of this year */
  feesPaid: number;
  /** Fee each pot was charged at the end of the year, same order as pots */
  potFees: number[];
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
  depletionYearBySimulation: Int32Array;
  /** Total amount withdrawn over the horizon per simulation */
  totalWithdrawnBySimulation: Float64Array;
  /** Year-by-year rows for the simulation requested via captureRunDetail */
  runDetail?: MonteCarloRunDetailRow[];
  simulationCount: number;
  horizonYears: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Small deterministic PRNG (mulberry32) - no dependencies needed.
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard normal draw via the Box-Muller transform.
function makeNormalSampler(random: () => number) {
  return function nextNormal() {
    // Avoid log(0) by shifting the first uniform draw into (0, 1]
    const uniform1 = 1 - random();
    const uniform2 = random();
    return (
      Math.sqrt(-2 * Math.log(uniform1)) * Math.cos(2 * Math.PI * uniform2)
    );
  };
}

function percentileOfSorted(sorted: Float64Array, percentile: number) {
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = position - lower;
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
  const previousReturns = new Float64Array(potCount);
  const drainOrder = pots.map((_, index) => index);
  // Target-mix order: each pot's target weight is its share of the
  // starting balances; this holds each pot's ideal post-withdrawal balance
  const potIdealBalances = new Float64Array(potCount);
  // Per-pot gross takes for the year being processed (scratch buffer)
  const potTakes = new Float64Array(potCount);

  // First simulation year (1-based) in which each pot can fund withdrawals.
  // The year-y withdrawal happens at age currentAge + (y - 1).
  const potAccessFromYear = pots.map(pot =>
    pot.accessAge == null
      ? 1
      : Math.max(1, Math.round(pot.accessAge - params.currentAge) + 1),
  );

  // --- Tax --------------------------------------------------------------
  // Spending is a net-of-tax requirement; withdrawals are gross. The flat
  // model taxes each pot's take at its own effective rate; the bands model
  // taxes the year's combined taxable income progressively.
  const taxModel: MonteCarloTaxModel = params.taxModel ?? 'flat';
  const potTaxRates = pots.map(pot =>
    clamp(pot.withdrawalTaxRate ?? 0, 0, MAX_WITHDRAWAL_TAX_RATE),
  );
  const potTaxableFractions = pots.map(pot =>
    clamp(pot.taxableFraction ?? 1, 0, 1),
  );
  // Bands sorted ascending, with a guaranteed 0-threshold first band so
  // income below the first user threshold is untaxed
  const taxBands = (params.taxBands ?? [])
    .map(band => ({
      from: clamp(band.from, 0, MAX_AMOUNT),
      rate: clamp(band.rate, 0, MAX_TAX_BAND_RATE),
    }))
    .sort((bandA, bandB) => bandA.from - bandB.from);
  if (taxBands.length === 0 || taxBands[0].from > 0) {
    taxBands.unshift({ from: 0, rate: 0 });
  }
  const hasTax =
    taxModel === 'bands'
      ? taxBands.some(band => band.rate > 0) &&
        potTaxableFractions.some(fraction => fraction > 0)
      : potTaxRates.some(rate => rate > 0);

  // --- Fees --------------------------------------------------------------
  const potFeeFixed = pots.map(pot =>
    clamp(pot.annualFeeFixed ?? 0, 0, MAX_AMOUNT),
  );
  const potFeeAdjusts = pots.map(pot => pot.feeAdjustsWithInflation ?? false);
  const potFeeRates = pots.map(pot =>
    clamp(pot.annualFeeRate ?? 0, 0, MAX_ANNUAL_FEE_RATE),
  );
  const hasFees =
    potFeeFixed.some(fee => fee > 0) || potFeeRates.some(rate => rate > 0);

  // Worst-case share of a gross withdrawal lost to tax; used to skip the
  // per-year shortfall precheck when capacity is comfortably sufficient
  const maxTaxRate =
    taxModel === 'bands'
      ? Math.max(0, ...taxBands.map(band => band.rate))
      : Math.max(0, ...potTaxRates);
  const minNetFactor = 1 - maxTaxRate;

  // Progressive tax on an annual taxable income, in today's money
  function bandTax(taxableIncome: number) {
    let tax = 0;
    for (let bandIndex = 0; bandIndex < taxBands.length; bandIndex++) {
      if (taxableIncome <= taxBands[bandIndex].from) {
        break;
      }
      const upper =
        bandIndex + 1 < taxBands.length
          ? taxBands[bandIndex + 1].from
          : Infinity;
      tax +=
        taxBands[bandIndex].rate *
        (Math.min(taxableIncome, upper) - taxBands[bandIndex].from);
    }
    return tax;
  }

  // Tax due on the takes currently in potTakes. Band thresholds are in
  // today's money, so taxable income is deflated by the replay's inflation
  // path before banding (thresholds effectively rise with inflation)
  function taxForTakes(cumulativeInflationNow: number) {
    if (!hasTax) {
      return 0;
    }
    if (taxModel === 'flat') {
      let tax = 0;
      for (let potIndex = 0; potIndex < potCount; potIndex++) {
        tax += potTakes[potIndex] * potTaxRates[potIndex];
      }
      return tax;
    }
    let taxable = 0;
    for (let potIndex = 0; potIndex < potCount; potIndex++) {
      taxable += potTakes[potIndex] * potTaxableFractions[potIndex];
    }
    return bandTax(taxable / cumulativeInflationNow) * cumulativeInflationNow;
  }

  // The slice of each pot's take (currently in potTakes) that was assessed
  // for tax: the taxable fraction under the bands model, or the whole take
  // under a nonzero flat rate. Used only for the captured run's drill-in.
  function captureTaxables(into: number[]) {
    for (let potIndex = 0; potIndex < potCount; potIndex++) {
      into[potIndex] =
        taxModel === 'bands'
          ? potTakes[potIndex] * potTaxableFractions[potIndex]
          : potTaxRates[potIndex] > 0
            ? potTakes[potIndex]
            : 0;
    }
  }

  // Attribute a year's tax to pots for the drill-in: exact per pot under
  // the flat model; under the bands model (where tax is computed on pooled
  // income) prorated by each pot's share of the taxable income
  function attributeTaxToPots(totalTax: number, into: number[]) {
    if (totalTax <= 0) {
      return;
    }
    if (taxModel === 'flat') {
      for (let potIndex = 0; potIndex < potCount; potIndex++) {
        into[potIndex] = potTakes[potIndex] * potTaxRates[potIndex];
      }
      return;
    }
    let taxableTotal = 0;
    for (let potIndex = 0; potIndex < potCount; potIndex++) {
      taxableTotal += potTakes[potIndex] * potTaxableFractions[potIndex];
    }
    if (taxableTotal <= 0) {
      return;
    }
    for (let potIndex = 0; potIndex < potCount; potIndex++) {
      into[potIndex] =
        totalTax *
        ((potTakes[potIndex] * potTaxableFractions[potIndex]) / taxableTotal);
    }
  }

  // Split a gross withdrawal across pots per the configured order, without
  // mutating balances; writes each pot's take into potTakes. Mirrors the
  // strategies' semantics exactly (same arithmetic as the pre-tax split).
  function computeTakes(
    grossTotal: number,
    year: number,
    accessibleTotal: number,
    lastAccessibleIndex: number,
  ) {
    potTakes.fill(0);
    if (grossTotal <= 0 || accessibleTotal <= 0) {
      return;
    }
    if (isSequential || isBestPerformer) {
      if (isBestPerformer) {
        // Drain the pot with the highest return last year first; ties
        // (and year 1, with no returns yet) fall back to the listed
        // order via the stable sort
        for (let potIndex = 0; potIndex < potCount; potIndex++) {
          drainOrder[potIndex] = potIndex;
        }
        drainOrder.sort(
          (potA, potB) => previousReturns[potB] - previousReturns[potA],
        );
      }
      let remaining = grossTotal;
      for (
        let orderIndex = 0;
        orderIndex < potCount && remaining > 0;
        orderIndex++
      ) {
        const potIndex = isBestPerformer ? drainOrder[orderIndex] : orderIndex;
        if (year < potAccessFromYear[potIndex]) {
          continue;
        }
        const take = Math.min(potBalances[potIndex], remaining);
        potTakes[potIndex] = take;
        remaining -= take;
      }
    } else if (isTargetMix) {
      // Withdraw so the accessible pots move back toward their target mix
      // (weights = shares of the starting balances, renormalized over
      // whichever pots are unlocked this year): each pot ideally ends at
      // its target share of the post-withdrawal total, so the withdrawal
      // comes from overweight pots, most overweight first
      let targetAccessible = 0;
      for (let potIndex = 0; potIndex < potCount; potIndex++) {
        if (year >= potAccessFromYear[potIndex]) {
          targetAccessible += potStartBalances[potIndex];
        }
      }
      const remainingTotal = accessibleTotal - grossTotal;
      for (let potIndex = 0; potIndex < potCount; potIndex++) {
        drainOrder[potIndex] = potIndex;
        potIdealBalances[potIndex] =
          year >= potAccessFromYear[potIndex] && targetAccessible > 0
            ? (potStartBalances[potIndex] / targetAccessible) * remainingTotal
            : 0;
      }
      drainOrder.sort(
        (potA, potB) =>
          potBalances[potB] -
          potIdealBalances[potB] -
          (potBalances[potA] - potIdealBalances[potA]),
      );
      let remaining = grossTotal;
      for (
        let orderIndex = 0;
        orderIndex < potCount && remaining > 0;
        orderIndex++
      ) {
        const potIndex = drainOrder[orderIndex];
        if (year < potAccessFromYear[potIndex]) {
          continue;
        }
        const excess = potBalances[potIndex] - potIdealBalances[potIndex];
        if (excess <= 0) {
          continue;
        }
        const take = Math.min(remaining, potBalances[potIndex], excess);
        potTakes[potIndex] = take;
        remaining -= take;
      }
      // Float-drift safety net: drain any accessible pot for whatever
      // tiny residue the excess passes left behind
      for (let potIndex = 0; potIndex < potCount && remaining > 0; potIndex++) {
        if (year < potAccessFromYear[potIndex]) {
          continue;
        }
        const take = Math.min(
          potBalances[potIndex] - potTakes[potIndex],
          remaining,
        );
        potTakes[potIndex] += take;
        remaining -= take;
      }
    } else {
      // Proportional split across accessible pots; the last accessible
      // pot takes the remainder so the total drops by exactly the
      // withdrawal (no float drift)
      let remaining = grossTotal;
      for (let potIndex = 0; potIndex < lastAccessibleIndex; potIndex++) {
        if (year < potAccessFromYear[potIndex]) {
          continue;
        }
        const take = grossTotal * (potBalances[potIndex] / accessibleTotal);
        potTakes[potIndex] = take;
        remaining -= take;
      }
      if (lastAccessibleIndex >= 0) {
        potTakes[lastAccessibleIndex] = remaining;
      }
    }
  }

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
    for (let historyIndex = 0; historyIndex < historyCount; historyIndex++) {
      blended[historyIndex] =
        weights.stocks * history[historyIndex].stocks +
        weights.bonds * history[historyIndex].bonds +
        weights.cash * history[historyIndex].cash;
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
    ? sortMonteCarloSpendingPhases(params.spendingPhases)
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

  // Planned contributions per pot per year, in today's money - split into
  // an inflation-adjusted and a flat portion so a year's deposit is
  // flat + adjusted × cumulativeInflation. Deterministic and shared by
  // every replay. Contributions into unknown pots (e.g. a pot that was
  // deleted) are ignored.
  const flatContributionsByYear: Float64Array[] = [];
  const adjustedContributionsByYear: Float64Array[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    flatContributionsByYear.push(new Float64Array(potCount));
    adjustedContributionsByYear.push(new Float64Array(potCount));
  }
  // While deposits are still to come, an empty pot isn't a dead plan -
  // depletion is only declared after the final contribution year
  let lastContributionYear = 0;
  let hasContributions = false;
  for (const contribution of params.contributions) {
    const potIndex = pots.findIndex(pot => pot.id === contribution.potId);
    const amount = clamp(contribution.annualAmount, 0, MAX_AMOUNT);
    if (potIndex === -1 || amount <= 0) {
      continue;
    }
    for (let year = 1; year <= horizonYears; year++) {
      const age = params.currentAge + year - 1;
      if (contribution.fromAge != null && age < contribution.fromAge) {
        continue;
      }
      if (contribution.toAge != null && age > contribution.toAge) {
        continue;
      }
      const target = contribution.adjustsWithInflation
        ? adjustedContributionsByYear
        : flatContributionsByYear;
      target[year][potIndex] += amount;
      hasContributions = true;
      if (year > lastContributionYear) {
        lastContributionYear = year;
      }
    }
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

  // Year-major balance buffers (totals across pots): balancesByYear[year][simulationIndex]
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

  const startingTotal = potStartBalances.reduce(
    (sum, balance) => sum + balance,
    0,
  );
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
    for (let potIndex = 0; potIndex < potCount; potIndex++) {
      if (year >= potAccessFromYear[potIndex]) {
        accessibleStart += potStartBalances[potIndex];
      }
    }
    accessibleStartByYear[year] = accessibleStart;
  }

  const initialRate =
    accessibleStartByYear[1] > 0
      ? plannedTodayByYear[1] / accessibleStartByYear[1]
      : 0;
  const withdrawnTotals = new Float64Array(simulationCount);
  const depletionYearBySimulation = new Int32Array(simulationCount).fill(-1);

  const captureIndex = params.captureRunDetail ?? -1;
  const runDetail: MonteCarloRunDetailRow[] | undefined =
    captureIndex >= 0 && captureIndex < simulationCount ? [] : undefined;

  for (
    let simulationIndex = 0;
    simulationIndex < simulationCount;
    simulationIndex++
  ) {
    potBalances.set(potStartBalances);
    previousReturns.fill(0);
    let total = startingTotal;
    // Cuts/raises from the withdrawal rule compound here, applied on top of
    // the planned spending path (so they persist across spending phases)
    let adjustmentFactor = 1;
    // This replay's realized inflation path: each year draws its own rate
    // when inflation volatility is set
    let cumulativeInflation = 1;
    let ratchetStreak = 0;
    let withdrawnSum = 0;
    let depleted = false;
    let simulationDepletionYear = Infinity;

    balancesByYear[0][simulationIndex] = toSafeAmount(total);

    for (let year = 1; year <= horizonYears; year++) {
      if (!depleted) {
        const startDeflator = deflate ? 1 / cumulativeInflation : 1;
        const planned = plannedTodayByYear[year] * cumulativeInflation;

        // Contributions land at the start of the year, before the
        // withdrawal: new money can fund this year's spending and earns
        // this year's return. Locked pots receive deposits too - the
        // access age only gates withdrawals.
        let contributionsThisYear = 0;
        let preContributionPotBalances: number[] | null = null;
        // Always sized to the pots when capturing, like the other per-pot
        // arrays, so captured rows keep one entry per pot even in plans
        // with no contributions
        const capturedPotContributions =
          runDetail && simulationIndex === captureIndex
            ? new Array<number>(potCount).fill(0)
            : null;
        if (hasContributions) {
          if (capturedPotContributions) {
            // The drill-in shows contributions as their own step, so its
            // Start balance column needs the pre-contribution snapshot
            preContributionPotBalances = Array.from(potBalances);
          }
          const flatContributions = flatContributionsByYear[year];
          const adjustedContributions = adjustedContributionsByYear[year];
          for (let potIndex = 0; potIndex < potCount; potIndex++) {
            const deposit =
              flatContributions[potIndex] +
              adjustedContributions[potIndex] * cumulativeInflation;
            if (deposit > 0) {
              potBalances[potIndex] += deposit;
              total += deposit;
              contributionsThisYear += deposit;
              if (capturedPotContributions) {
                capturedPotContributions[potIndex] = deposit;
              }
            }
          }
        }
        let withdrawal: number;

        // Only pots that have reached their access age can fund this year's
        // withdrawal; locked pots stay invested but untouchable
        let accessibleTotal = 0;
        let lastAccessibleIndex = -1;
        for (let potIndex = 0; potIndex < potCount; potIndex++) {
          if (year >= potAccessFromYear[potIndex]) {
            accessibleTotal += potBalances[potIndex];
            lastAccessibleIndex = potIndex;
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
        // spending is taken as-is. It guards against rule-driven cuts, so
        // it only applies in years with planned spending - a deliberate
        // zero-spend phase takes nothing. Like the phase amounts it's in
        // today's money, so it rises with this replay's inflation path
        const minimumThisYear = minimumWithdrawal * cumulativeInflation;
        if (
          rule.type !== 'none' &&
          minimumWithdrawal > 0 &&
          planned > 0 &&
          withdrawal < minimumThisYear
        ) {
          withdrawal = minimumThisYear;
        }

        const yearStartTotal = total;
        // The spending requirement is net of tax; withdrawalTaken is the
        // gross that leaves the pots to deliver it
        const netRequired = withdrawal;
        let withdrawalTaken: number;
        let netDelivered: number;
        let fundingShortfall = false;

        // Per-pot balances at the point of failure: accessible pots are
        // consumed, locked pots keep their money
        let failurePotSnapshot: number[] | null = null;
        const capturedPotReturns =
          runDetail && simulationIndex === captureIndex
            ? new Array<number | null>(potCount).fill(null)
            : null;
        const capturedPotWithdrawals = capturedPotReturns
          ? new Array<number>(potCount).fill(0)
          : null;
        const capturedPotTaxes = capturedPotReturns
          ? new Array<number>(potCount).fill(0)
          : null;
        const capturedPotTaxables = capturedPotReturns
          ? new Array<number>(potCount).fill(0)
          : null;
        const capturedPotFees = capturedPotReturns
          ? new Array<number>(potCount).fill(0)
          : null;
        // Snapshot taken before the withdrawal touches the balances; with
        // contributions in play, the pre-contribution snapshot from the
        // top of the year is the displayed starting point
        const capturedPotStartBalances = capturedPotReturns
          ? (preContributionPotBalances ?? Array.from(potBalances))
          : null;

        // Net capacity: what withdrawing every accessible penny would
        // actually deliver after tax. The full-drain split is only worth
        // computing when a shortfall is actually possible - even taxed at
        // the highest marginal rate, capacity above the requirement means
        // the plan funds this year
        let accessibleNetCapacity = accessibleTotal;
        if (hasTax && accessibleTotal * minNetFactor <= netRequired) {
          computeTakes(
            accessibleTotal,
            year,
            accessibleTotal,
            lastAccessibleIndex,
          );
          accessibleNetCapacity =
            accessibleTotal - taxForTakes(cumulativeInflation);
        }

        // A shortfall needs an actual requirement: a zero-spend year with
        // nothing accessible (e.g. before delayed contributions start, or
        // while every pot is still locked) is not a failure
        if (netRequired > 0 && accessibleNetCapacity <= netRequired) {
          fundingShortfall = true;
          // The accessible pots can't cover this year's spending (locked
          // pots may still hold money, but the plan failed to fund it);
          // they get emptied for whatever net they can deliver
          withdrawnSum = toSafeAmount(
            withdrawnSum + accessibleTotal * startDeflator,
          );
          withdrawalTaken = accessibleTotal;
          netDelivered = Math.max(0, accessibleNetCapacity);
          if (runDetail && simulationIndex === captureIndex) {
            failurePotSnapshot = Array.from(potBalances, (balance, potIndex) =>
              year >= potAccessFromYear[potIndex] ? 0 : Math.round(balance),
            );
            if (capturedPotWithdrawals) {
              for (let potIndex = 0; potIndex < potCount; potIndex++) {
                capturedPotWithdrawals[potIndex] =
                  year >= potAccessFromYear[potIndex]
                    ? potBalances[potIndex]
                    : 0;
              }
            }
            if (capturedPotTaxes) {
              // potTakes still holds the everything-accessible split from
              // the net-capacity check above
              attributeTaxToPots(
                accessibleTotal - netDelivered,
                capturedPotTaxes,
              );
            }
            if (capturedPotTaxables && hasTax) {
              captureTaxables(capturedPotTaxables);
            }
          }
          potBalances.fill(0);
          total = 0;
          depleted = true;
          simulationDepletionYear = year;
          depletionCounts[year]++;
        } else {
          // Solve the gross withdrawal that delivers the net requirement:
          // g = net + tax(takes(g)). Tax is piecewise linear in g with
          // marginal rates < 1, so this fixed point converges geometrically
          let grossTotal = netRequired;
          if (hasTax) {
            for (let iteration = 0; iteration < 40; iteration++) {
              computeTakes(
                grossTotal,
                year,
                accessibleTotal,
                lastAccessibleIndex,
              );
              const next = netRequired + taxForTakes(cumulativeInflation);
              if (Math.abs(next - grossTotal) <= 1e-7 * Math.max(1, next)) {
                grossTotal = next;
                break;
              }
              grossTotal = next;
            }
            grossTotal = Math.min(grossTotal, accessibleTotal);
          }

          computeTakes(grossTotal, year, accessibleTotal, lastAccessibleIndex);
          for (let potIndex = 0; potIndex < potCount; potIndex++) {
            potBalances[potIndex] -= potTakes[potIndex];
          }
          withdrawnSum = toSafeAmount(
            withdrawnSum + grossTotal * startDeflator,
          );
          withdrawalTaken = grossTotal;
          netDelivered = netRequired;

          if (capturedPotWithdrawals) {
            for (let potIndex = 0; potIndex < potCount; potIndex++) {
              capturedPotWithdrawals[potIndex] = potTakes[potIndex];
            }
          }
          if (capturedPotTaxes) {
            attributeTaxToPots(grossTotal - netRequired, capturedPotTaxes);
          }
          if (capturedPotTaxables && hasTax) {
            captureTaxables(capturedPotTaxables);
          }

          // Every pot experiences the same market year: historical models
          // pick one history year for all pots, and normally-drawn pots
          // share one market shock scaled by their own volatility. Pots
          // holding the same investments therefore earn the same return.
          let historyIndex = -1;
          if (returnModel === 'historical-bootstrap') {
            historyIndex = Math.floor(random() * historyCount);
          } else if (returnModel === 'historical-sequence') {
            historyIndex = (simulationIndex + year - 1) % historyCount;
          }
          const marketShock = hasNormalDrawPot ? nextNormal() : 0;

          total = 0;
          for (let potIndex = 0; potIndex < potCount; potIndex++) {
            if (potBalances[potIndex] > 0) {
              const blended = potHistoricalReturns[potIndex];
              const yearReturn =
                blended && historyIndex >= 0
                  ? blended[historyIndex]
                  : potMeans[potIndex] + potStdDevs[potIndex] * marketShock;
              if (capturedPotReturns) {
                capturedPotReturns[potIndex] = yearReturn;
              }
              previousReturns[potIndex] = yearReturn;
              potBalances[potIndex] *= 1 + yearReturn;
              if (potBalances[potIndex] <= 0) {
                // A sub-(-100%) return draw wiped this pot out
                potBalances[potIndex] = 0;
              }
            }
            total += potBalances[potIndex];
          }
          if (total <= 0) {
            total = 0;
            // An empty balance with deposits still to come isn't a dead
            // plan - future contributions re-seed the pots. This year's
            // deposits have already landed, so >= is the right bound.
            if (year >= lastContributionYear) {
              depleted = true;
              simulationDepletionYear = year;
              depletionCounts[year]++;
            }
          }
        }

        // Realize this year's inflation, drawing a random rate when
        // volatility is set (fixed mean otherwise)
        if (inflationMean != null) {
          const yearInflation =
            inflationStdDev > 0
              ? Math.max(-0.9, inflationMean + inflationStdDev * nextNormal())
              : inflationMean;
          cumulativeInflation *= 1 + yearInflation;
        }

        // Management fees come out at the end of the year, after growth
        // and inflation: a percentage of each pot's balance plus a fixed
        // amount (optionally inflation-adjusted so it stays constant in
        // today's money). Fees can deplete a plan on their own.
        let feesThisYear = 0;
        if (hasFees && !fundingShortfall && total > 0) {
          for (let potIndex = 0; potIndex < potCount; potIndex++) {
            if (potBalances[potIndex] <= 0) {
              continue;
            }
            const fee =
              potBalances[potIndex] * potFeeRates[potIndex] +
              potFeeFixed[potIndex] *
                (potFeeAdjusts[potIndex] ? cumulativeInflation : 1);
            const charged = Math.min(potBalances[potIndex], fee);
            potBalances[potIndex] -= charged;
            feesThisYear += charged;
            if (capturedPotFees) {
              capturedPotFees[potIndex] = charged;
            }
          }
          total = 0;
          for (let potIndex = 0; potIndex < potCount; potIndex++) {
            total += potBalances[potIndex];
          }
          if (total <= 0) {
            total = 0;
            // Same future-deposits guard as the post-growth check
            if (year >= lastContributionYear) {
              depleted = true;
              simulationDepletionYear = year;
              depletionCounts[year]++;
            }
          }
        }
        const endDeflator = deflate ? 1 / cumulativeInflation : 1;

        if (runDetail && simulationIndex === captureIndex) {
          // Every emitted amount is deflated, rounded, and kept within the
          // formatter-safe range - one mechanism so a new field can't
          // forget the wrapper
          const emit = (value: number, deflator: number) =>
            toSafeAmount(Math.round(value * deflator));
          // Per-pot amounts are rounded so they sum exactly to their row's
          // already-rounded total: floor each part, then hand the leftover
          // cents to the parts that lost the most in flooring (largest
          // remainder, ties to the lower pot index). Independently rounded
          // parts can visibly disagree with the total by a cent or two.
          const emitParts = (
            values: ArrayLike<number> | null,
            deflator: number,
            target: number,
          ) => {
            if (!values) {
              return [];
            }
            const scaled = Array.from(values, value => value * deflator);
            const parts = scaled.map(Math.floor);
            const shortfall =
              target - parts.reduce((sum, part) => sum + part, 0);
            if (shortfall < 0 || shortfall > parts.length) {
              // The parts don't reconcile with this target (safe-amount
              // clamping, or a degenerate float path) - fall back to
              // independent rounding rather than distorting them
              return Array.from(values, value => emit(value, deflator));
            }
            const byLargestRemainder = parts
              .map((_, partIndex) => partIndex)
              .sort(
                (partIndexA, partIndexB) =>
                  scaled[partIndexB] -
                    parts[partIndexB] -
                    (scaled[partIndexA] - parts[partIndexA]) ||
                  partIndexA - partIndexB,
              );
            for (let centIndex = 0; centIndex < shortfall; centIndex++) {
              parts[byLargestRemainder[centIndex]] += 1;
            }
            return parts.map(toSafeAmount);
          };
          // The displayed starting balance excludes contributions - the
          // drill-in's chain is start + contributions - withdrawal +
          // growth - fees = end
          const startBalance = emit(
            yearStartTotal - contributionsThisYear,
            startDeflator,
          );
          const contributions = emit(contributionsThisYear, startDeflator);
          const withdrawal = emit(withdrawalTaken, startDeflator);
          const taxPaid = emit(withdrawalTaken - netDelivered, startDeflator);
          const base = {
            year,
            startBalance,
            contributions,
            potContributions: emitParts(
              capturedPotContributions,
              startDeflator,
              contributions,
            ),
            withdrawal,
            taxPaid,
            potWithdrawals: emitParts(
              capturedPotWithdrawals,
              startDeflator,
              withdrawal,
            ),
            potTaxes: emitParts(capturedPotTaxes, startDeflator, taxPaid),
            // No displayed total to reconcile against
            potTaxables: (capturedPotTaxables ?? []).map(taxable =>
              emit(taxable, startDeflator),
            ),
            potStartBalances: emitParts(
              capturedPotStartBalances,
              startDeflator,
              startBalance,
            ),
          };
          if (fundingShortfall) {
            // The plan failed to fund this year's spending; any remaining
            // balance was locked in pots not yet accessible, not lost to
            // markets. Accessible pots gave up everything they had.
            const locked = emit(
              yearStartTotal - withdrawalTaken,
              startDeflator,
            );
            runDetail.push({
              ...base,
              growth: 0,
              feesPaid: 0,
              // No fees on a shortfall year - the plan stops before the
              // end-of-year charge
              potFees: (capturedPotFees ?? []).map(() => 0),
              endBalance: 0,
              // The snapshot is the locked money the failure note reports
              potBalances: emitParts(failurePotSnapshot, startDeflator, locked),
              potReturns: capturedPotReturns ?? [],
              ...(locked > 0 && { inaccessibleBalance: locked }),
            });
          } else {
            const feesPaid = emit(feesThisYear, endDeflator);
            const endBalance = emit(total, endDeflator);
            runDetail.push({
              ...base,
              // In today's money, growth is the real gain: the inflation
              // drag comes out of it. Fees are reported separately, so
              // growth stays pure market performance
              growth: toSafeAmount(
                Math.round(
                  (total + feesThisYear) * endDeflator -
                    (yearStartTotal - withdrawalTaken) * startDeflator,
                ),
              ),
              feesPaid,
              potFees: emitParts(capturedPotFees, endDeflator, feesPaid),
              endBalance,
              potBalances: emitParts(potBalances, endDeflator, endBalance),
              potReturns: (capturedPotReturns ?? []).map(potReturn =>
                potReturn == null
                  ? null
                  : (1 + potReturn) * (endDeflator / startDeflator) - 1,
              ),
            });
          }
        }

        // Store this replay's balance, in today's money when deflating
        balancesByYear[year][simulationIndex] = toSafeAmount(
          total * endDeflator,
        );
      }
      // Post-depletion years stay at zero (total is 0 here)
    }

    withdrawnTotals[simulationIndex] = withdrawnSum;
    if (simulationDepletionYear !== Infinity) {
      depletionYearBySimulation[simulationIndex] = simulationDepletionYear;
    }

    if (!depleted) {
      survivedCount++;
    }

    if (
      simulationDepletionYear < worstDepletionYear ||
      (simulationDepletionYear === worstDepletionYear &&
        total < worstFinalBalance)
    ) {
      worstSimIndex = simulationIndex;
      worstDepletionYear = simulationDepletionYear;
      worstFinalBalance = total;
    }
  }

  const worstRunPath: number[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    worstRunPath.push(Math.round(balancesByYear[year][worstSimIndex]));
  }

  const percentileBands: MonteCarloPercentileBand[] = [];
  // The final year's sorted balances double as the median-ending-balance
  // source below, saving a second sort of the same array
  let finalSorted = new Float64Array(0);
  for (let year = 0; year <= horizonYears; year++) {
    const sorted = balancesByYear[year].slice().sort();
    if (year === horizonYears) {
      finalSorted = sorted;
    }
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

  // Earliest/median/latest failure years straight from the histogram
  // counts (no need to materialize one entry per failed simulation)
  const totalDepleted = simulationCount - survivedCount;
  let earliestDepletionYear: number | null = null;
  let latestDepletionYear: number | null = null;
  let medianDepletionYear: number | null = null;
  const medianTargetIndex = Math.floor((totalDepleted - 1) / 2);
  let seenDepleted = 0;
  for (let year = 1; year <= horizonYears; year++) {
    if (depletionCounts[year] === 0) {
      continue;
    }
    earliestDepletionYear ??= year;
    latestDepletionYear = year;
    if (medianDepletionYear == null) {
      seenDepleted += depletionCounts[year];
      if (seenDepleted > medianTargetIndex) {
        medianDepletionYear = year;
      }
    }
  }

  const withdrawnSorted = withdrawnTotals.slice().sort();

  return {
    successRate: survivedCount / simulationCount,
    percentileBands,
    depletionHistogram,
    depletionProbabilityByYear,
    medianEndingBalance: Math.round(percentileOfSorted(finalSorted, 0.5)),
    medianTotalWithdrawn: Math.round(percentileOfSorted(withdrawnSorted, 0.5)),
    medianDepletionYear,
    earliestDepletionYear,
    latestDepletionYear,
    worstRunPath,
    endingBalances: balancesByYear[horizonYears].slice(),
    depletionYearBySimulation,
    totalWithdrawnBySimulation: withdrawnTotals,
    runDetail,
    simulationCount,
    horizonYears,
  };
}
