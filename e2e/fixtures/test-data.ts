/**
 * Data models and factory functions for E2E test data.
 *
 * Design principles:
 * - All models are TypeScript interfaces (not type aliases) for extensibility.
 * - Factory functions embed a timestamp so every generated value is globally
 *   unique across parallel workers, preventing test-data collisions.
 * - Dollar amounts are plain numbers (e.g. 500 = $500.00).
 *   Use `parseMoney` / `formatMoney` from utils/money-utils.ts when you need
 *   to compare UI text to a numeric value.
 */

// ─── Data model interfaces ────────────────────────────────────────────────────

export interface AccountData {
  /** Display name shown in the sidebar and account header. */
  name: string;
  /** Opening balance in dollars. */
  initialBalance: number;
  /** When true, the account is excluded from the budget envelope math. */
  offBudget?: boolean;
}

export interface TransactionData {
  /** Payee name. Free text — will not be matched to an existing payee. */
  payee: string;
  /** Optional memo / notes. */
  notes?: string;
  /** Optional budget category name. */
  category?: string;
  /**
   * Absolute dollar amount (always positive).
   * Direction is determined by `type`.
   */
  amount: number;
  /** 'debit' = money out; 'credit' = money in. */
  type: 'debit' | 'credit';
}

export interface BudgetMonth {
  /** ISO date string for the first day of the month, e.g. "2024-01-01". */
  month: string;
  /** Category group name. */
  groupName: string;
  /** Category name within the group. */
  categoryName: string;
  /** Dollar amount to budget. */
  budgeted: number;
}

// ─── Factory functions ────────────────────────────────────────────────────────

/**
 * Generates a unique account name using a high-resolution timestamp.
 * The timestamp suffix guarantees no two parallel workers collide even
 * when they start within the same second.
 */
export function generateUniqueAccountName(prefix = 'Test Checking'): string {
  return `${prefix} ${Date.now()}`;
}

/**
 * Returns a fully-populated `AccountData` object.
 * Any field can be overridden via the optional `overrides` argument.
 */
export function generateAccountData(overrides?: Partial<AccountData>): AccountData {
  return {
    name: generateUniqueAccountName(),
    initialBalance: 1000,
    offBudget: false,
    ...overrides,
  };
}

/**
 * Returns a fully-populated `TransactionData` object.
 * The payee name includes a timestamp to keep each transaction unique.
 */
export function generateTransactionData(overrides?: Partial<TransactionData>): TransactionData {
  return {
    payee: `Test Payee ${Date.now()}`,
    notes: 'Automated E2E transaction',
    amount: 75,
    type: 'debit',
    ...overrides,
  };
}

/**
 * Computes the expected account balance after a list of transactions
 * is applied to an initial balance.
 *
 * @param initialBalance Starting balance in dollars.
 * @param transactions   List of transactions to apply in order.
 * @returns Expected balance in dollars.
 */
export function computeExpectedBalance(
  initialBalance: number,
  transactions: TransactionData[],
): number {
  return transactions.reduce((balance, tx) => {
    return tx.type === 'debit' ? balance - tx.amount : balance + tx.amount;
  }, initialBalance);
}
