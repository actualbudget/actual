import type { ForecastSource } from './forecast';
import type { CustomReportEntity } from './reports';
import type { RuleConditionEntity } from './rule';

export type DashboardPageEntity = {
  id: string;
  name: string;
  tombstone: boolean;
};

export type TimeFrame = {
  start: string;
  end: string;
  mode:
    | 'sliding-window'
    | 'static'
    | 'full'
    | 'lastMonth'
    | 'lastYear'
    | 'yearToDate'
    | 'priorYearToDate'
    | 'currentQuarter'
    | 'previousQuarter';
};

type AbstractWidget<
  T extends string,
  Meta extends Record<string, unknown> | null = null,
> = {
  id: string;
  dashboard_page_id: string;
  type: T;
  x: number;
  y: number;
  width: number;
  height: number;
  meta: Meta;
  tombstone: boolean;
};

export type NetWorthWidget = AbstractWidget<
  'net-worth-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    interval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
    mode?: 'trend' | 'stacked';
  } | null
>;

export type CashFlowWidget = AbstractWidget<
  'cash-flow-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    showBalance?: boolean;
  } | null
>;

export type SpendingAverageRange =
  | {
      mode: 'last-n-months';
      months: 3 | 6 | 12;
    }
  | {
      mode: 'year-to-date';
    }
  | {
      mode: 'all-time';
    };

export type SpendingWidget = AbstractWidget<
  'spending-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    compare?: string;
    compareTo?: string;
    isLive?: boolean;
    mode?: 'single-month' | 'budget' | 'average';
    averageRange?: SpendingAverageRange;
  } | null
>;
export type BudgetAnalysisWidget = AbstractWidget<
  'budget-analysis-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    interval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
    graphType?: 'Line' | 'Bar';
    showBalance?: boolean;
    balanceOnly?: boolean;
    showHiddenCategories?: boolean;
  } | null
>;
export type CustomReportWidget = AbstractWidget<
  'custom-report',
  { id: string }
>;
export type CrossoverWidget = AbstractWidget<
  'crossover-card',
  {
    name?: string;
    expenseCategoryIds?: string[];
    incomeAccountIds?: string[];
    timeFrame?: TimeFrame;
    safeWithdrawalRate?: number; // 0.04 default
    estimatedReturn?: number | null; // annual
    expectedContribution?: number | null; // monthly dollar amount
    projectionType?: 'hampel' | 'median' | 'mean'; // expense projection method
    showHiddenCategories?: boolean; // show hidden categories in selector
    expenseAdjustmentFactor?: number; // multiplier for expenses (default 1.0)
  } | null
>;
export type MarkdownWidget = AbstractWidget<
  'markdown-card',
  { content: string; text_align?: 'left' | 'right' | 'center' }
>;

export type MonteCarloAllocationPreset =
  | 'equity-100'
  | 'equity-80'
  | 'equity-60'
  | 'equity-40'
  | 'cash'
  | 'custom';

export type MonteCarloWithdrawalStrategy =
  | 'proportional'
  | 'sequential'
  | 'best-performer'
  | 'target-mix';

export type MonteCarloReturnModel =
  | 'normal'
  | 'historical-bootstrap'
  | 'historical-sequence';

export type MonteCarloWithdrawalRuleType =
  | 'none'
  | 'guardrails'
  | 'ratcheting'
  | 'floor-ceiling'
  | 'boundaries';

// Parameters for all rule types are kept side by side so switching between
// rules in the UI preserves each rule's settings
export type MonteCarloWithdrawalRuleMeta = {
  type: MonteCarloWithdrawalRuleType;
  // Guardrails (Guyton-Klinger)
  prosperityTriggerPct?: number; // rate fell this fraction below initial
  prosperityIncreasePct?: number;
  preservationTriggerPct?: number; // rate rose this fraction above initial
  preservationCutPct?: number;
  // Ratcheting (Kitces)
  balanceThresholdMultiple?: number; // e.g. 1.5x initial balance
  consecutiveYears?: number;
  ratchetIncreasePct?: number;
  // Floor & ceiling (Bengen)
  floorPct?: number; // fraction below the inflation-adjusted initial
  ceilingPct?: number; // fraction above the inflation-adjusted initial
  // Boundaries
  upperRateThreshold?: number; // absolute withdrawal rate, e.g. 0.06
  upperCutPct?: number;
  lowerRateThreshold?: number;
  lowerIncreasePct?: number;
};

export type MonteCarloSpendingPhaseMeta = {
  id: string;
  name?: string;
  /**
   * Age the phase begins (inclusive). Null/absent = starts immediately;
   * only meaningful on the first phase.
   */
  fromAge?: number | null;
  /** Yearly spending in minor units, in today's money */
  annualWithdrawal?: number;
};

export type MonteCarloPotMeta = {
  id: string;
  name?: string;
  startingBalance?: number; // integer minor units (cents)
  allocationPreset?: MonteCarloAllocationPreset;
  expectedReturnMean?: number; // decimal fraction (0.06 = 6%)
  returnStdDev?: number; // decimal fraction
  /** Age from which the pot can fund withdrawals; null = immediately */
  accessAge?: number | null;
  /**
   * Account whose live balance supplies the starting balance;
   * null/undefined = manually entered balance
   */
  accountId?: string | null;
  /**
   * Flat tax model: effective tax rate on withdrawals from this pot as a
   * decimal fraction (0.15 = 15%)
   */
  withdrawalTaxRate?: number;
  /**
   * Bands tax model: share of a withdrawal that counts as taxable income
   * (pension ~0.75, tax-free account 0), as a decimal fraction
   */
  taxableFraction?: number;
  /** Fixed yearly fee in minor units, today's money */
  annualFeeFixed?: number;
  /** Whether the fixed fee rises with inflation */
  feeAdjustsWithInflation?: boolean;
  /** Yearly fee as a fraction of the end-of-year balance (0.0022 = 0.22%) */
  annualFeeRate?: number;
};

/** One recurring yearly contribution into a pot over an age window */
export type MonteCarloContributionMeta = {
  id: string;
  name?: string;
  /** The pot the contribution is paid into */
  potId?: string;
  /** Age the contribution starts (inclusive); null/absent = starts now */
  fromAge?: number | null;
  /** Age the contribution stops (inclusive); null/absent = end of plan */
  toAge?: number | null;
  /** Yearly amount in minor units, in today's money */
  annualAmount?: number;
  /** Whether the amount rises with inflation */
  adjustsWithInflation?: boolean;
};

export type MonteCarloTaxModel = 'flat' | 'bands';

/** One tax band: income from `from` upward taxed at `rate` */
export type MonteCarloTaxBandMeta = {
  id: string;
  /** Annual taxable income threshold in minor units, today's money */
  from?: number;
  /** Decimal fraction (0.2 = 20%) */
  rate?: number;
};

export type MonteCarloWidget = AbstractWidget<
  'monte-carlo-card',
  {
    name?: string;
    pots?: MonteCarloPotMeta[];
    withdrawalStrategy?: MonteCarloWithdrawalStrategy;
    returnModel?: MonteCarloReturnModel;
    withdrawalRule?: MonteCarloWithdrawalRuleMeta;
    /** Minimum annual withdrawal in minor units; 0 or absent = no floor */
    minimumWithdrawal?: number;
    spendingPhases?: MonteCarloSpendingPhaseMeta[];
    /** Recurring yearly contributions into pots */
    contributions?: MonteCarloContributionMeta[];
    /** Mean yearly inflation as a decimal fraction; null = flat withdrawals */
    inflationMean?: number | null;
    /** Yearly inflation volatility as a decimal fraction; 0 = fixed rate */
    inflationStdDev?: number;
    /** How withdrawals are taxed; absent = 'flat' */
    taxModel?: MonteCarloTaxModel;
    /** Bands model: progressive tax bands over annual taxable income */
    taxBands?: MonteCarloTaxBandMeta[];
    currentAge?: number;
    /** Age the pot must last to; the horizon is targetAge - currentAge */
    targetAge?: number;
    simulationCount?: number;
  } | null
>;

export type AgeOfMoneyGranularity = 'daily' | 'weekly' | 'monthly';

export type AgeOfMoneyWidget = AbstractWidget<
  'age-of-money-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    granularity?: AgeOfMoneyGranularity;
  } | null
>;

type SpecializedWidget =
  | NetWorthWidget
  | CashFlowWidget
  | SpendingWidget
  | BudgetAnalysisWidget
  | CrossoverWidget
  | MarkdownWidget
  | MonteCarloWidget
  | SummaryWidget
  | CalendarWidget
  | FormulaWidget
  | SankeyWidget
  | AgeOfMoneyWidget
  | BalanceForecastWidget;
export type DashboardWidgetEntity = SpecializedWidget | CustomReportWidget;
export type NewDashboardWidgetEntity = Omit<
  DashboardWidgetEntity,
  'id' | 'tombstone' | 'dashboard_page_id'
>;
// Exported/imported (json) widget definition
export type ExportImportCustomReportWidget = Omit<
  CustomReportWidget,
  'id' | 'meta' | 'tombstone'
> & {
  meta: Omit<CustomReportEntity, 'tombstone'>;
};
export type ExportImportDashboardWidget = Omit<
  ExportImportCustomReportWidget | SpecializedWidget,
  'tombstone'
>;

export type ExportImportDashboard = {
  // Dashboard exports can be versioned; currently we support
  // only a single version, but lets account for multiple
  // future versions
  version: 1;
  widgets: ExportImportDashboardWidget[];
};

export type SummaryWidget = AbstractWidget<
  'summary-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    content?: string;
  } | null
>;

export type BaseSummaryContent = {
  type: 'sum' | 'avgPerMonth' | 'avgPerYear' | 'avgPerTransact';
  fontSize?: number;
};

export type PercentageSummaryContent = {
  type: 'percentage';
  divisorConditions: RuleConditionEntity[];
  divisorConditionsOp: 'and' | 'or';
  divisorAllTimeDateRange?: boolean;
  fontSize?: number;
};

export type SummaryContent = BaseSummaryContent | PercentageSummaryContent;

export type CalendarWidget = AbstractWidget<
  'calendar-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
  } | null
>;

export type FormulaWidget = AbstractWidget<
  'formula-card',
  {
    name?: string;
    formula?: string;
    fontSize?: number;
    fontSizeMode?: 'dynamic' | 'static';
    staticFontSize?: number;
    showTitle?: boolean;
    colorFormula?: string;
    queriesVersion?: number;
    queries?: Record<
      string,
      {
        conditions?: RuleConditionEntity[];
        conditionsOp?: 'and' | 'or';
        timeFrame?: TimeFrame;
      }
    >;
  } | null
>;

export type SankeyWidget = AbstractWidget<
  'sankey-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    mode?: 'budgeted' | 'spent';
    topNcategories?: number;
    categorySort?: 'per-group' | 'global' | 'budget-order';
    showPercentages?: boolean;
    groupAccounts?: boolean;
    showTransfers?: boolean;
    layerFrom?: string;
    layerTo?: string;
  } | null
>;

export type BalanceForecastWidget = AbstractWidget<
  'balance-forecast-card',
  {
    name?: string;
    startDate?: string;
    endDate?: string;
    accounts?: string[];
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    granularity?: 'Daily' | 'Monthly';
    source?: ForecastSource;
  } | null
>;
