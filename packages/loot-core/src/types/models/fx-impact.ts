/** A rate used for a valuation: its value, kind, source and timestamp. */
export type FxRateUsed = {
  rate: string;
  kind: string;
  source: string;
  timestamp: string | null;
  fallback: boolean;
};

export type FxImpactReason =
  | 'rate-unavailable'
  | 'precision-unavailable'
  | 'amount-out-of-range'
  | 'native-missing'
  | 'sign-mismatch'
  | 'stale-encoding'
  | 'transfer-link-broken'
  | 'transfer-direction-invalid'
  | 'transfer-quantity-mismatch'
  | 'family-sum-mismatch'
  | 'exchange-family-ambiguous';

export type FxImpactRequest = {
  /** YYYY-MM */
  startMonth: string;
  /** YYYY-MM, not before startMonth */
  endMonth: string;
  /** null: every live account */
  accountIds: string[] | null;
  /** null: every currency */
  currencies: string[] | null;
};

/** Base minor units; null means unknown, never zero. */
export type FxStocks = {
  booked: number | null;
  basis: number | null;
  value: number | null;
  unrealized: number | null;
};

export type FxChanges = {
  flows: number | null;
  /** Includes feeRealized. */
  realized: number | null;
  feeRealized: number | null;
  /** Booked, not FX. */
  feeExpense: number | null;
  /** Closing minus opening. */
  unrealized: number | null;
  carry: number | null;
  settlement: number | null;
  /** Change in value minus booked. */
  gap: number | null;
};

export type FxImpactAccountReason = {
  reason: FxImpactReason;
  since: string;
  fromAccountId?: string;
};

export type FxAccountMonth = FxChanges & {
  accountId: string;
  opening: FxStocks & { native: number | null; rate: FxRateUsed | null };
  closing: FxStocks & { native: number | null; rate: FxRateUsed | null };
  reasons: FxImpactAccountReason[];
};

export type FxTotal = FxChanges & {
  opening: FxStocks;
  closing: FxStocks;
  incompleteAccountIds: string[];
};

export type FxExchangeEnd = {
  accountId: string;
  /** null: budget currency */
  currency: string | null;
  /** Principal at source, gross at destination; null when unrepresentable. */
  native: number | null;
  /** Native, 0 when none; null when unrepresentable. */
  fee: number | null;
  feeBooked: number | null;
  /** Principal realization at this endpoint. */
  realized: number | null;
  feeRealized: number | null;
  referenceRate: FxRateUsed | null;
};

export type FxExchange = {
  id: string;
  date: string;
  /** Frozen principal V; null when unrepresentable. */
  value: number | null;
  source: FxExchangeEnd;
  destination: FxExchangeEnd;
  /** Reference estimate, not additive. */
  spread: number | null;
};

export type FxBridgeAccount = {
  accountId: string;
  opening: number | null;
  closing: number | null;
  flows: number | null;
  posted: number;
  broughtForward: number | null;
  covers: string[];
  openDate: string;
  openingRate: FxRateUsed | null;
  closeDate: string;
  rate: FxRateUsed | null;
  unavailableReason:
    | 'rate-unavailable'
    | 'precision-unavailable'
    | 'amount-out-of-range'
    | null;
  stale: boolean;
};

export type FxBridgeMonth = {
  budgetType: 'envelope' | 'tracking';
  opening: number | null;
  closing: number | null;
  flows: number | null;
  posted: number | null;
  broughtForward: number | null;
  incomplete: boolean;
  /** Bounded posted + broughtForward; 0 only when that sum is null or unrepresentable. */
  contribution: number;
  /** What the refresh writes to fx-incomplete. */
  contributionIncomplete: boolean;
  /** null for tracking */
  cell: { value: number; incomplete: boolean } | null;
  /** Cell value or incomplete flag differs from the computed pair. */
  pending: boolean;
  accounts: FxBridgeAccount[];
};

export type FxImpactMonth = {
  month: string;
  openDate: string;
  closeDate: string;
  accounts: FxAccountMonth[];
  currencies: Array<FxTotal & { currency: string }>;
  budgetCurrencyFeeExpense: number | null;
  /** Selected scope, includes budgetCurrencyFeeExpense in feeExpense. */
  total: FxTotal;
  /** Calendar decomposition over the bridge scope. */
  onBudget: FxTotal;
  /** null when the month is not a created month */
  bridge: FxBridgeMonth | null;
  exchanges: FxExchange[];
  diagnostics: { fees: number | null; spread: number | null };
};

export type FxImpactResult = {
  today: string;
  budgetCurrency: string;
  basePrecision: number;
  startMonth: string;
  /** Clamped to the current month. */
  endMonth: string;
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    precision: number | null;
    offbudget: boolean;
    closed: boolean;
  }>;
  unknownAccountIds: string[];
  createdMonths: { first: string; last: string } | null;
  months: FxImpactMonth[];
};
